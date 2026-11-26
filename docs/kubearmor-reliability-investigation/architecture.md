# Architecture map (commit a95bfe7)

## Components

```
                    ┌─────────────────────────────────────┐
                    │  KubeArmor Operator (optional)      │
                    │  pkg/KubeArmorOperator              │
                    │  KubeArmorConfig reconcile, DS/relay  │
                    └──────────────┬──────────────────────┘
                                   │ ConfigMap, DaemonSet spec
                                   ▼
┌──────────────┐   informers    ┌──────────────────────────────────────┐
│ K8s API      │◄───────────────│ KubeArmor Daemon (per node)          │
│ KSP/HSP/CSP  │                │ KubeArmor/core/kubeArmor.go          │
│ ConfigMap    │                ├────────────┬─────────────┬──────────┤
└──────────────┘                │ SystemMonitor│ RuntimeEnforcer│ Feeder │
                                │ monitor/     │ enforcer/        │ feeder/│
                                └──────┬───────┴────────┬─────────┴───┬──┘
                                       │ BPF ring/perf    │ maps/profiles │ gRPC
                                       ▼                  ▼               ▼
                                 eBPF / trace      AppArmor/BPF-LSM   karmor/relay
```

| Component | Package path | Responsibility |
| --- | --- | --- |
| Daemon | `KubeArmor/core` | Orchestration: K8s/CRI watches, endpoint state, policy fan-out, shutdown |
| System monitor | `KubeArmor/monitor` | Syscall/process events, log assembly, unresolved-event retry |
| Runtime enforcer | `KubeArmor/enforcer` | Policy → AppArmor / BPF-LSM / SELinux |
| Log feeder | `KubeArmor/feeder` | JSON/stdout, gRPC WatchAlerts/Logs/Messages, alert throttle map, policy match for alerts |
| Policy gRPC (non-k8s) | `KubeArmor/policy` | JSON policy events from `karmor` |
| K8s controller | `pkg/KubeArmorController` | CRD types, admission, **PodRefresher**, stub KSP reconciler |
| Operator | `pkg/KubeArmorOperator` | Install, node labeling, image/TLS reconciliation |
| Relay | `deployments` + separate repo | Aggregate node gRPC |

## Initialization (`KubeArmor()` in `core/kubeArmor.go`)

Order (simplified): config load → `NewKubeArmorDaemon` → `InitLogger` → `ServeLogFeeds` (async) → `InitSystemMonitor` / BPF → `InitRuntimeEnforcer` → presets/USB/NPE → K8s handlers → informer sync → `go WatchK8sPods` → `go ServeLogFeeds` (gRPC) → block on signal → `DestroyKubeArmorDaemon`.

## Shutdown (`DestroyKubeArmorDaemon`)

1. `close(core.StopChan)` — CRI/docker/NRI loops
2. Close monitor, enforcer, optional agents
3. Log “Terminated” **before** `CloseStateAgent`
4. `CloseLogger` → `DestroyFeeder` (`WgServer.Wait` for gRPC)
5. `WgDaemon.Wait` — does **not** include monitor worker goroutines (see validated bugs)

**Monitor** uses a **separate** `monitor.StopChan`, which is **never closed** on shutdown (`grep close(StopChan)` only hits `core`).

## Telemetry path

`TraceSyscall` / BPF → `ContextChan` → `UpdateLogs` → `BuildLogBase` (`GetDateTimeNow`) → enforcer side-channel → `Feeder.PushLog` → file/stdout + gRPC broadcast (with throttle + policy match).

## Shared state

- Daemon: `EndPoints`, `Containers`, `SecurityPolicies`, `OwnerInfo` (mutexed)
- Feeder: `EventStructs` (per-subscriber channels), `AlertMap`, `SecurityPolicies` (match cache)
- Monitor: `NsMap`, `NamespacePidsMap`, `PodLabelsMap`

## Test infrastructure

| Layer | Location | Notes |
| --- | --- | --- |
| Unit | `KubeArmor/**_*_test.go` | `go test` after BPF codegen in CI |
| Race smoke | `core/kubeUpdate_race_test.go` | Panic-free only |
| Feeder | `feeder/feeder_test.go` | gRPC struct add/remove, health |
| Monitor | `monitor/systemMonitor_test.go` | Needs BPF init |
| E2E | `tests/k8s_env`, `tests/nonk8s_env` | Ginkgo + `karmor` |
| CI | `.github/workflows/ci-test-go.yml`, `ci-test-ginkgo.yml`, `ci-test-ebpf.yml` | LLVM, libbpf, bpftool |

## Recently active modules (from `git log -5`)

Helm/stable v1.7.7, monitor/exec ID follow-ups (#3043–#3050 area), CRI-O hot-loop reports (#3007).

## Package verification

All paths above exist at commit `a95bfe7d1c3f1fe757d642cea96e26d569c3e07b` on local clone `/agent/repos/KubeArmor`.