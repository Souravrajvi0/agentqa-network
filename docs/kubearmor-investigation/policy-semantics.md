# KubeArmor policy semantics

Source of truth: in-tree wiki (`wiki/security_policy.md`, `wiki/runtime_enforcer.md`), CRDs under `deployments/CRD` / `pkg/KubeArmorController/crd`, Go types in `KubeArmor/types/types.go`, example policies in `examples/` and `tests/k8s_env/**/res`.

Tree reviewed: `kubearmor/KubeArmor` default branch (`main`), cloned 2026-11-26.

## Policy objects

| Kind | Scope | Selector | Typical producer |
| --- | --- | --- | --- |
| `KubeArmorPolicy` (KSP) | Namespace, pods/containers | `spec.selector.matchLabels`, `matchExpressions`, optional `kubearmor.io/container.name` | Users, `policy-templates`, tests |
| `KubeArmorHostPolicy` (HSP) | Node / host OS | `spec.nodeSelector.matchLabels` (hostname regex / comma lists supported in matcher) | Users, systemd / `karmor` gRPC in non-k8s |
| `KubeArmorClusterPolicy` (CSP) | Cluster-wide pods | `matchExpressions` with `key: namespace` or `key: label` | Users |
| `KubeArmorNetworkPolicy` | Network (Cilium-adjacent CRD in controller clientset) | Network selector + protocols/DNS | Daemon `networkPolicyEnforcer` |

There is no Cilium NetworkPolicy compiler in the daemon. Cilium-aligned naming appears as `KubeArmorNetworkPolicy` plus protocol helpers in `feeder/policyMatcher.go`. Production enforcement of file/process/cap rules is KubeArmor’s own CRDs.

## Documented actions

From `wiki/security_policy.md`:

- **Allow** — whitelist entry. Combined with default posture (`audit` or `block`) for unmatched operations of that class.
- **Audit** — do not deny; emit an alert/log.
- **Block** — deny and alert.

Empty `spec.action` is compiled to **Block** in `CreateSecurityPolicy` (`kubeUpdate.go`). Syscall rules are documented as Audit-only regardless of YAML action.

Default posture is per-namespace (annotations / ConfigMap): file, network, capabilities. Process whitelist posture in the BPF compiler currently keys off **file** default posture (`UpdateContainerRules` uses `defaultPosture.FileAction` for `PROCWHITELIST`). There is no `ProcessAction` field on `DefaultPosture`.

## Matching

KSP identities always include `namespaceName=<ns>` plus each `matchLabels` pair except `kubearmor.io/container.name`, which is split into `Selector.Containers`.

`MatchIdentities` requires every compiled identity to appear on the endpoint (AND). Empty identity lists do not match.

`MatchExpIdentities` implements `matchExpressions` with `key: label`:

- `In` values go to `MatchExpIdentities` (OR among values).
- `NotIn` values go to `NonIdentities` **only if no `In` operator was already seen** while compiling (`CreateSecurityPolicy`). Operator order in YAML therefore changes compiled selector.
- Combined In+NotIn, when both lists are populated, is evaluated incorrectly: a successful NotIn check forces `matched = true` even if In missed. Confirmed by `go test ./common` (see `findings.md` KA-A1).

CSP without a namespace `In` expression lists **all namespaces at parse time** and stores them on the policy. Namespaces created later are not added until the CSP is reprocessed.

## Path / glob / recursive

Supported path forms:

- `matchPaths` — exact path (copied into BPF `InnerKey.Path [200]byte`; longer paths truncate).
- `matchDirectories` — directory + optional `recursive`. BPF encodes `DIR` and `RECURSIVE` bits; parent HINT keys are installed for prefix walks (`enforcer.bpf.c`).
- `matchPatterns` — glob, compiled for **AppArmor** (`SetProcessMatchPatterns` / `SetFileMatchPatterns`) and used by the **feeder** via `filepath.Match`. **BPF-LSM `buildRuleList` never reads `MatchPatterns`.** A valid pattern-only Block policy is therefore a no-op on BPF-LSM for enforcement.

Recursive directory tests exist in `tests/k8s_env/ksp/ksp_test.go` and `tests/k8s_env/syscalls/`. Those tests require a cluster + LSM; they were not executed on this CI-style VM.

## Merge and precedence

Multiple KSPs/CSPs that select the same endpoint are appended to `EndPoint.SecurityPolicies`. BPF compile (`insertRule`) keeps Audit from overwriting Block/Allow, but **Allow vs Block last write wins** (policy slice order). AppArmor profile generation similarly unions rules into one profile per container.

Smoke fixture for multi-policy: `tests/k8s_env/smoke/res/ksp-wordpress-two-policies.yaml` (two Block file `fromSource` rules on `app: wordpress`). Expected: both `/etc/passwd` and `/etc/shadow` reads via `/bin/cat` Block. That case does not exercise Allow vs Block on the same key.

## Workload identity special cases (documented / observed)

- Pods in `kube-system` and Cilium operator pods are forced to `kubearmor-policy: audited` (`handlePodEvent`).
- SELinux enforcer in-cluster forces audited for containers.
- No LSM → audited.
- `Status.ContainerStatuses` only; **init containers are never mapped** (`InitContainerStatuses` does not appear in the tree).
- `OwnerInfo` is keyed by pod name, not `namespace/name`.
- `hostPID` is a field on alerts (`HostPID`) and an operator DaemonSet flag; it is not a policy selector. Workloads with `hostPID: true` still use container MntNS for BPF maps when the runtime reports it.

## Expected outcomes used in this review

Example (docs + smoke):

```yaml
apiVersion: security.kubearmor.com/v1
kind: KubeArmorPolicy
metadata:
  name: block-etc-passwd-read
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-web-app
  file:
    matchPaths:
      - path: /etc/passwd
  action: Block
```

Expected: matching pods cannot open `/etc/passwd`; a Block alert is exported when the LSM fires. Actual enforcement depends on active backend (BPF-LSM / AppArmor / SELinux) and successful map/profile load. This investigation did not run kernel enforcement on the agent VM.
