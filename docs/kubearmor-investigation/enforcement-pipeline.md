# KubeArmor enforcement pipeline

## Org map (production vs samples)

| Repo | Role | Mentorship / production |
| --- | --- | --- |
| `kubearmor/KubeArmor` | Daemon (Go + C BPF), operator (`pkg/KubeArmorOperator`), controller/CRDs (`pkg/KubeArmorController`), in-tree tests, wiki | Primary. Mentorship issues live here (`good first issue`, `help wanted`). |
| `kubearmor/kubearmor-client` | `karmor` kubectl plugin / CLI | Production UX; talks to relay gRPC. |
| `kubearmor/kubearmor-relay-server` | Standalone relay (also deployed from main chart) | Production event fan-out. |
| `kubearmor/policy-templates` | Curated KSP/HSP YAML | Samples / community templates, not runtime. |
| `kubearmor/kubearmor-kafka-client`, `kubearmor-log-client`, `otel-adapter`, `kubearmor-prometheus-exporter`, `grafana-datasource` | Export adapters | Optional production. |
| `kubearmor/libbpf` | Forked libbpf Go bindings | Build dependency. |
| `kubearmor/charts` | Helm | Deploy path. |
| `k8tls`, `modelarmor`, `kvm-service`, demos, websites | Adjacent | Out of daemon policy path. |

In-tree daemon layout:

- `KubeArmor/core` — k8s watchers, CRI (containerd, CRI-O, Docker, NRI, OCI hook).
- `KubeArmor/enforcer` — AppArmor, SELinux, BPF-LSM.
- `KubeArmor/BPF` — `enforcer.bpf.c`, `system_monitor.c`, presets, throttling.
- `KubeArmor/feeder` — log/alert matching and gRPC.
- `KubeArmor/monitor` — process tree, syscall parsing, ring buffer.
- `pkg/KubeArmorOperator` — `KubeArmorConfig` reconcile, DaemonSet/relay/controller deploy.
- `pkg/KubeArmorController` — CRD types; **policy Reconcile is a no-op**.

## Control plane vs data plane

```
kubectl apply KSP/HSP/CSP
        │
        ▼
  kube-apiserver CRDs
        │
        ├─ Daemon informers (WatchSecurityPolicies / Host / Cluster)
        │     CreateSecurityPolicy → dm.SecurityPolicies
        │     UpdateSecurityPolicy → EndPoint.SecurityPolicies
        │     RuntimeEnforcer.UpdateSecurityPolicies
        │
        └─ KubeArmorPolicyReconciler.Reconcile → return empty
              (status subresource never written)
```

Operator path (`KubeArmorConfig`):

- Snitch labels nodes (enforcer, runtime socket, BTF, AppArmor fs).
- Operator creates per-enforcer DaemonSets, relay Deployment, controller, ConfigMap.
- `UpdateCrdStatus` sets phase `Running` with message “Kubearmor Application is Up and Running” after ConfigMap/image updates (`UpdateKubeArmorConfigMap`), **not** after per-node BPF map apply success.
- TLS watch compares DaemonSet `DesiredNumberScheduled == CurrentNumberScheduled`, not `NumberReady` / crash loops.

Daemon does **not** receive policies from the operator; it watches the API itself.

## Compile / apply

1. `buildRuleList` walks process/file/network/capability matchPaths and matchDirectories.
2. `insertRule` writes `InnerKey` → mask bits (`EXEC`, `READ`, `WRITE`, `DIR`, `RECURSIVE`, `DENY`, `AUDIT`, `OWNER`, `PTS`, `ARGSET`).
3. `UpdateContainerRules` diffs against the previous inner map, `Put`/`Delete` keys. Map errors are logged (`error adding rule to map…`) and **not** surfaced on the KSP status.
4. If the container is missing from `ContainerMap` (CRI already unregistered), apply is skipped silently.
5. Host rules use outer key `{PidNS:0, MntNS:0}` (`AddHostToMap`).

AppArmor path writes profiles via `apparmor_parser`. SELinux is host / non-k8s.

## Events

Kernel LSM / tracepoints → BPF ring buffer → `SystemMonitor` → identity lookup (PidNS+MntNS) → `Feeder.PushLog`.

Alert matching (`feeder/policyMatcher.go`) reconstructs which policy fired, including `filepath.Match` for patterns. That can produce alerts for pattern rules even when BPF did not enforce them (or fail to alert when AppArmor blocked without a matching log path — historical issue #552).

Throttling:

- BPF map `kubearmor_alert_throttle` (`BPF/throttling.h`, max 256 keys).
- Userspace `Feeder.AlertMap` keyed by `{PidNs, MntNs}`.
- Host traffic and a container whose namespaces are `{0,0}` share one bucket. Deleting a container with zero namespaces calls `DeleteAlertMapKey` and can evict the host bucket. Tracked as #3014 / #3016.

Dropped events: open issue #3052 (silent loss vs reporting).

Export: gRPC to relay / `karmor logs`; optional Kafka, stdout, OTel, Prometheus exporters in sibling repos.

## Container lifecycle vs stale BPF

Registration: CRI start → PidNS/MntNS → `RegisterContainer` → inner map created when rules exist.

Unregistration: destroy → `UnregisterContainer` / `DeleteContainerInnerMap`.

Gaps:

- CRI-O monitor sleeps 50ms and, on start failure, deletes the ID from the local set so the next loop retries (`crioHandler.go`). Exited containers that still list as present produce a tight warning loop (#3007).
- Policy `UpdateFunc` does not insert a missing entry into `dm.SecurityPolicies` (#3015). Informer resync as MODIFIED can leave the global list empty while endpoints are updated from a copy, or the reverse.
- `UpdateSecurityPolicy` copies the endpoint slice, mutates the copy, then **replaces the live endpoint**. Concurrent policy applies can drop each other’s `SecurityPolicies`. Existing `kubeUpdate_race_test.go` only asserts no panic.

## Test infrastructure

| Path | What it covers | Kernel needed |
| --- | --- | --- |
| `KubeArmor/*_test.go` | Race, AppArmor string, feeder, policy gRPC, certs | No |
| `tests/k8s_env/{ksp,csp,smoke,syscalls,visibility,throttling,blockposture,multicontainer,nsp,presets,privileged,configmap,networktests}` | Ginkgo + `karmor` logs + kubectl | Yes (kind/k3s + LSM) |
| `tests/nonk8s_env` | Docker compose / host policy | Yes |
| `.github/workflows/ci-test-ginkgo.yml`, `ci-test-ebpf.yml`, `ci-test-lvh-matrix.yml`, `ci-test-systemd.yml` | CI BPF environments | Yes |
| `ci-test-go.yml` | `go test ./...` in `KubeArmor/` after `go generate` | Headers/LLVM, not full LSM |

This agent VM: `go test ./common` ran without BPF. Ginkgo k8s/LSM suites were **not** executed. Results below that depend on kernel enforcement are marked “code-only” or “deduped GitHub”, never fabricated.

## Mentorship-shaped work

Good first / help-wanted adjacent to this review: #552 (pattern logs), documentation issues (#2956, #2980), operator status. Larger: #3015, #3014, #3007, #3018 (`sched_process_fork` on 6.16+).
