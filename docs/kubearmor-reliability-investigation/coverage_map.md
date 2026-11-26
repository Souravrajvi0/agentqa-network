# Coverage map (multi-pass)

| Pass | Focus | Modules read | Tests run | Gaps |
| --- | --- | --- | --- | --- |
| 1 | Architecture | `core/kubeArmor.go`, wiki, CONTRIBUTING | — | Relay binary not in main module |
| 2 | Feeder | `feeder.go`, `logServer.go`, `policyMatcher.go` | `go test ./feeder` PASS | PushPath drop metrics untested |
| 3 | Monitor | `systemMonitor.go`, `logUpdate.go`, `processTree.go` | — (BPF setup) | `StopChan` lifecycle |
| 4 | Daemon lifecycle | `DestroyKubeArmorDaemon`, `MonitorSystemEvents`, `ServeLogFeeds` | — | No shutdown integration test |
| 5 | Controller | `kubearmorpolicy_controller.go`, `podrefresh_controller.go` | — | envtest only in suite_test |
| 6 | Config / common | `config/`, `common/common.go` | `go test ./common` FAIL | MatchExpIdentities |
| 7 | Dedup | GitHub search | — | — |
| 8 | Skeptical review | All findings | — | See rejected_findings.md |

## Unit test surface (Go, in-repo)

| Package | `_test.go` count | Notable gaps |
| --- | --- | --- |
| `feeder` | 1 | Throttle map, PushLog overload |
| `common` | (no dedicated match tests upstream) | `MatchExpIdentities`, `GetUptimeTimestamp` |
| `core` | 3 | Shutdown, informer resync insert |
| `monitor` | 1 | Requires generated BPF objects |
| `policy` | 1 | gRPC status only |
| `pkg/KubeArmorOperator/controller` | 2 | Happy-path reconcile |

## Integration

- `tests/k8s_env/*` — policy semantics (not executed here)
- `ci-test-go` builds BPF before `go test ./...` in `KubeArmor/` only — **`core` imports `monitor` embeds** → local `go test ./core` fails without generate (see finding KA-REL-TEST-001)

## Insufficiently tested (hypothesis → validated/candidate)

| Area | Risk | Finding ID |
| --- | --- | --- |
| `MatchExpIdentities` | Wrong endpoint bookkeeping | KA-REL-001 |
| `WgDaemon` vs worker goroutines | Shutdown race | KA-REL-002 (dedup #2652) |
| `monitor.StopChan` | Workers never signalled | KA-REL-003 |
| Policy informer `UpdateFunc` | Stale global policy list | KA-REL-004 (dedup #3015) |
| Pod refresher full list + sleep | Controller scalability | KA-REL-005 (dedup #2800) |