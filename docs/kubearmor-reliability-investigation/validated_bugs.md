# Validated bugs

Commit: `a95bfe7d1c3f1fe757d642cea96e26d569c3e07b`

---

## KA-REL-001 — `MatchExpIdentities` In+NotIn logic (Category A)

| Field | Detail |
| --- | --- |
| Files | `KubeArmor/common/common.go` L590–622; policy compile `KubeArmor/core/kubeUpdate.go` L1319–1333 |
| Expected | Pod matches only if In label hit **and** NotIn exclusion absent |
| Actual | `MatchExpIdentities(..., ["app=api","env=prod"])` → **true** with In=`app=web`, NotIn=`env=dev` |
| Root cause | NotIn loop sets `matched=true` on final iteration when exclusion absent, ignoring failed In |
| Test | See `regression/match_exp_identities_test.go`; run copied into `KubeArmor/common` |

**Observed output (2026-11-26):**

```
--- FAIL: TestMatchExpIdentities_InAndNotIn/not_in-set_and_not_excluded
    match_identities_test.go:56: MatchExpIdentities([namespaceName=default app=api env=prod]) = true, want false
FAIL	github.com/kubearmor/KubeArmor/KubeArmor/common	0.005s
```

**Adversarial review:** Not intentional—breaks Kubernetes selector semantics for combined In/NotIn. No other matcher compensates on the daemon hot path (`GetSecurityPolicies` calls both `MatchIdentities` and `MatchExpIdentities`).

**Confidence:** High

---

## KA-REL-002 — `WgDaemon` wrapper pattern (Category B)

| Field | Detail |
| --- | --- |
| Files | `KubeArmor/core/kubeArmor.go` — `ServeLogFeeds` L285–290, `MonitorSystemEvents` L318–328, `DestroyKubeArmorDaemon` L258 |
| Expected | `WgDaemon.Wait()` blocks until monitor/gRPC workers finish |
| Actual | Workers spawned with `go`; wrapper returns immediately and calls `Done()` |
| Evidence | Code inspection; **dedup:** [#2652](https://github.com/kubearmor/KubeArmor/issues/2652) open on main |
| Test | Not run locally (shutdown integration) |

**Confidence:** High (code + existing public issue)

---

## KA-REL-003 — `monitor.StopChan` never closed (Category B)

| Field | Detail |
| --- | --- |
| Files | `monitor/systemMonitor.go` L135; `monitor/logUpdate.go` L148; `core/kubeArmor.go` L184 |
| Expected | Shutdown closes channel observed by `UpdateLogs` / `TraceSyscall` |
| Actual | Only `core.StopChan` closed; monitor uses separate var, never closed |
| Evidence | `grep close(StopChan)` → single match in `core` |
| Dedup | Related [#2295](https://github.com/kubearmor/KubeArmor/issues/2295) (context migration) |

**Confidence:** High

---

## KA-REL-005 — Core package tests need BPF generate (Category H / A fix)

| Field | Detail |
| --- | --- |
| Evidence | `go test ./core` → `pattern probe_bpfel.o: no matching files found` without CI toolchain |
| Expected | CONTRIBUTING / development_guide documents same steps as `ci-test-go.yml` |
| Mitigation | Run `make -C BPF kernel_headers`, `go generate ./...` per workflow |

**Confidence:** High (reproduced on VM)

---

## KA-REL-007 — Pod refresher operational anti-patterns (Category B)

| Field | Detail |
| --- | --- |
| Files | `podrefresh_controller.go` — full `List`, `time.Sleep(10s)` L154, `Sleep(5s)` L245 |
| Dedup | [#2800](https://github.com/kubearmor/KubeArmor/issues/2800), [#2798](https://github.com/kubearmor/KubeArmor/issues/2798) |
| Validation | Static only on this pass |

**Confidence:** High (code matches open reports)