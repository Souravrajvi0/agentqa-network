# KubeArmor correctness findings

Investigation of `kubearmor/KubeArmor` (org + main repo `main`), 2026-11-26.

Scope: policy compilation, matching, alerting, operator reconcile. No weaponized policies, no live-cluster bypass work, no PRs opened against KubeArmor.

Classes: **A** parser/matcher/status · **B** compile/apply/events/merge · **C** operator–daemon–kernel consistency.

Validation legend:

- **Unit** — executed on this VM.
- **Code** — static, with file citations; no kernel.
- **GitHub** — already tracked; not re-claimed as new.
- **Not run** — needs kind/minikube + LSM (`tests/k8s_env`).

## Confirmed (new or independently reproduced)

### KA-A1 — `MatchExpIdentities` treats NotIn success as a match (Class A)

**Expected:** `matchExpressions` with `key: label`, `operator: In` values `app=web` **and** `operator: NotIn` values `env=dev` matches only pods that have `app=web` and do not have `env=dev`.

**Policy shape:**

```yaml
apiVersion: security.kubearmor.com/v1
kind: KubeArmorPolicy
metadata:
  name: web-not-dev
  namespace: default
spec:
  selector:
    matchExpressions:
      - key: label
        operator: In
        values: ["app=web"]
      - key: label
        operator: NotIn
        values: ["env=dev"]
  file:
    matchPaths:
      - path: /etc/passwd
  action: Audit
```

**Actual (unit):** after compile, both lists are populated only if NotIn appears before In. `MatchExpIdentities` then, on the last NotIn value, sets `matched = true` when the excluded label is absent — even if In never matched.

Executed: `go test ./common` in KubeArmor with `TestMatchExpIdentities_InAndNotIn`. Failure:

```
MatchExpIdentities([namespaceName=default app=api env=prod]) = true, want false
```

Related compile bug: `CreateSecurityPolicy` ignores `NotIn` when `hasInOperator` is already true (`kubeUpdate.go`), so YAML order changes whether NotIn exists at all.

Not a kernel/BPF limitation.

Dedup: no open issue titled for this matcher; #2956 (undocumented CRD features) is adjacent, not a duplicate.

### KA-A2 — KSP/HSP/CSP status is never reconciled (Class A)

**Expected:** CRD `status` subresource reports whether the policy is applied.

**Actual:** `pkg/KubeArmorController/internal/controller/kubearmorpolicy_controller.go` `Reconcile` returns `ctrl.Result{}, nil` with no Get/Update. Apply failures stay in daemon logs only.

Code-only. Mentorship-sized.

### KA-B1 — BPF-LSM drops `matchPatterns` (Class B)

**Expected (CRD + docs):** `file.matchPatterns` / `process.matchPatterns` are valid rules; Block/Audit should apply.

**Actual:** `enforcer/bpflsm/rulesHandling.go` `buildRuleList` has no `MatchPatterns` loop. AppArmor and the feeder still handle patterns. Pattern-only policies on BPF-LSM do not compile into maps.

Code-only. Related open #552 (host MatchPatterns logs) and closed #1911 (pattern Block + missing relay logs). Not duplicated as a new public exploit.

### KA-B2 — Allow vs Block last-writer-wins on the same BPF key (Class B / private)

**Expected:** two policies targeting the same path should have defined precedence (typically deny-wins).

**Actual:** `insertRule` only protects Audit from overwriting non-Audit. A later Allow overwrites an earlier Block for the same `InnerKey`.

Userspace simulation of the same bit logic:

```
allow then block: deny=true
block then allow: deny=false
block then audit: deny=true (audit does not overwrite)
```

If Block should occur but Allow is applied later, enforcement follows Allow. Details kept in the private track below (no exploit recipe). Needs a regression in `tests/k8s_env` with two KSPs on one path — **Not run** here.

### KA-B3 — Process whitelist posture uses file default posture (Class B)

`DefaultPosture` has `FileAction`, `NetworkAction`, `CapabilitiesAction` only. `UpdateContainerRules` writes `PROCWHITELIST` from `defaultPosture.FileAction`. Namespace `kubearmor-file-posture` vs process Allow rules can disagree. Code-only.

### KA-C1 — Operator `Running` is not daemon apply health (Class C)

`UpdateKubeArmorConfigMap` sets `KubeArmorConfig.status.phase=Running` after ConfigMap write. Daemon map `Put` errors are local logs. Policy CRDs stay empty (KA-A2). TLS check uses Current vs Desired scheduled, not Ready.

Code-only. Distinct from DaemonSet crash-loop visibility.

### KA-C2 — Endpoint copy-replace can drop concurrent policies (Class C)

`UpdateSecurityPolicy` snapshots endpoints, mutates the snapshot’s `SecurityPolicies`, then assigns the whole struct back. Two overlapping policy events can lose one policy set. `kubeUpdate_race_test.go` only checks for panic. Code-only; related to #3015 (resync insert).

## Deduplicated (tracked upstream — do not refile)

| ID | Topic | Class | Notes |
| --- | --- | --- | --- |
| [#3015](https://github.com/kubearmor/KubeArmor/issues/3015) | `UpdateFunc` does not insert missing policies | B | Confirmed in `WatchSecurityPolicies` UpdateFunc |
| [#3014](https://github.com/kubearmor/KubeArmor/issues/3014) / [#3016](https://github.com/kubearmor/KubeArmor/issues/3016) | Host alerts `{0,0}` throttle / DeleteAlertMapKey | B | Host map key is `{0,0}` in `AddHostToMap` |
| [#3007](https://github.com/kubearmor/KubeArmor/issues/3007) | CRI-O 50ms retry hot-loop | C | `MonitorCrioEvents` sleep 50ms + delete on start error |
| [#3018](https://github.com/kubearmor/KubeArmor/issues/3018) | `sched_process_fork` on Linux 6.16+ | B | Kernel attach; CI-kernel vs product |
| [#3046](https://github.com/kubearmor/KubeArmor/issues/3046) | Host throttle one bucket | B | |
| [#3052](https://github.com/kubearmor/KubeArmor/issues/3052) | Silent dropped events | B | |
| [#2968](https://github.com/kubearmor/KubeArmor/issues/2968) | NRI / containerd clash on operator reboot | C | |
| [#552](https://github.com/kubearmor/KubeArmor/issues/552) | Host matchPatterns logs | B | Overlaps KA-B1 alerting |

## Code-only special cases (not claimed as new CVEs)

- **Init containers:** `handlePodEvent` iterates `obj.Status.ContainerStatuses` only. Init/ephemeral containers never join `pod.Containers`. Expected if undocumented: init has no KSP. Documented special case gap.
- **Owner map:** `dm.OwnerInfo[podName]` without namespace — AppArmor annotation patching can target the wrong owner when names collide.
- **Path length 200:** `copy(key.Path[:], []byte(path.Path))` silent truncate. Distinct prefixes that share the first 200 bytes alias.
- **CSP namespace snapshot** at create time; new namespaces missed until policy update.
- **Duplicate `AllowedArgs` assignment** in `buildRuleList` (copy-paste); harmless.
- **`GloabalImagePullSecrets` typo** in `KubeArmorConfig` API; JSON tag is `globalImagePullSecrets` so wire format is fine.

## Private track (security-control failures)

Do not publish exploit recipes. Report via GitHub Security Advisories or `support@kubearmor.io` per `SECURITY.md` if maintainers treat deny-overwrite as a vulnerability.

1. **KA-B2** Allow overwriting Block on the same BPF inner key (policy order / merge).
2. **KA-A1** when used with Block action: a KSP with In+NotIn can attach to the wrong pods (broader than intended). This is a matcher correctness bug; impact depends on whether extra pods receive Block or Allow. No live-cluster confirmation.

No fabricated Block/Allow outcomes from kernel tests. No KubeArmor PRs opened.

## Suggested follow-up (not implemented)

1. Fix `MatchExpIdentities` to `matched = InOK && !NotInHit`; always compile NotIn; add the unit test from `regression/match_identities_test.go`.
2. Deny-wins (or explicit precedence) in `insertRule`.
3. Write KSP status from daemon apply result or delete the unused reconciler.
4. Compile matchPatterns for BPF or reject them in admission when enforcer is BPF-LSM.
5. Key OwnerInfo and AlertMap host entries so `{0,0}` is reserved.
