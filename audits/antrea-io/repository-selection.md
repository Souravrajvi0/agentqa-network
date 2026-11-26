# Phase 0 — Repository selection

Audit target: **antrea-io/antrea** at `3aca3e73e` (`main`, 2026-11-24).
Local checkout: `/home/ec2-user/workspace/antrea`.

## Organization inventory

| Repository | Role | Production dataplane? | Last observed activity |
|---|---|---|---|
| [antrea-io/antrea](https://github.com/antrea-io/antrea) | Agent, Controller, CNI, IPAM, NetworkPolicy, OVS, Proxy, multicast, Traceflow, PacketCapture, CRDs, e2e | **Yes — primary** | Active (`main` Nov 2026) |
| [antrea-io/theia](https://github.com/antrea-io/theia) | Network observability / flow analytics | No (observability product) | Active |
| [antrea-io/antrea-ui](https://github.com/antrea-io/antrea-ui) | Web UI | No | Active |
| [antrea-io/antrea-operator](https://github.com/antrea-io/antrea-operator) | Operator install/lifecycle | Indirect | Active |
| [antrea-io/website](https://github.com/antrea-io/website) | antrea.io site | No | Active |
| [antrea-io/image-utils](https://github.com/antrea-io/image-utils) | Test/dev container images | No | Active |
| [antrea-io/has-changes](https://github.com/antrea-io/has-changes) | GitHub Action | No | Active |
| [antrea-io/antrea-releaser](https://github.com/antrea-io/antrea-releaser) | Release utilities | No | Sparse |
| [antrea-io/.project](https://github.com/antrea-io/.project) | CNCF project metadata | No | Active |
| [antrea-io/nephe](https://github.com/antrea-io/nephe) | Cloud security policies | Separate product | Stale (last push 2023-12) |
| [antrea-io/benchci](https://github.com/antrea-io/benchci) | Go benchmark CI | No | Stale (2021) |
| [antrea-io/resource-auditing](https://github.com/antrea-io/resource-auditing) | Resource audit tooling | No | Stale (2021) |
| [antrea-io/review-manager](https://github.com/antrea-io/review-manager) | PR review helper | No | Archived |

## Why this tree

All production Antrea Agent / Controller / CNI / IPAM / policy / OVS code lives in **antrea-io/antrea**:

- `cmd/antrea-agent`, `cmd/antrea-controller`, `cmd/antrea-cni`
- `pkg/agent/**` (CNI server, OVS flows, policy reconciler, IPAM, proxy, multicast, Traceflow, PacketCapture)
- `pkg/controller/**` (NetworkPolicy, IPAM, ExternalIPPool, Egress, Traceflow admission)
- `pkg/ipam/**` (pool allocator used by Agent and Controller)
- `pkg/ovs/**`, `pkg/apis/**`, `multicluster/**`

Docs/examples: `docs/**`, `website`. Mentorship PacketCapture work is also in this repo (`pkg/agent/packetcapture`).

## Mentorship evidence (LFX / CNCF)

Recurring Antrea LFX projects all point at **antrea-io/antrea**, not docs-only trees:

- 2025 Term 2: PacketCapture IPv6 / flexible filters — issues [#6861](https://github.com/antrea-io/antrea/issues/6861), [#6976](https://github.com/antrea-io/antrea/issues/6976)
- 2025 Term 2: Dependabot → Renovate across antrea-io — issue [#7155](https://github.com/antrea-io/antrea/issues/7155)
- 2026 Term 1: PacketCapture BPF vs tcpdump/libpcap CI suite — issue [#7701](https://github.com/antrea-io/antrea/issues/7701)

Mentors in those listings include `@antoninbas`, `@tnqn`, `@luolanzone`, `@hangyan`. PacketCapture BPF generation is an active correctness surface; this audit treated it as already under mentorship and did not re-open #7701 as a “new” finding.

## Local test harnesses (antrea-io/antrea)

| Harness | Location | Runnable without a cluster |
|---|---|---|
| Go unit tests | `pkg/**/*_test.go`, `cmd/**` | Yes (`go test ./pkg/ipam/...`) |
| Integration | `test/integration` | Needs more env (OVS/netns) |
| Agent simulator | `cmd/antrea-agent-simulator`, `docs/antrea-agent-simulator.md` | Needs images + cluster for scale, not for IPAM unit bugs |
| e2e | `test/e2e`, `test/e2e-secondary-network` | Kind / Vagrant / remote cluster |
| PacketCapture BPF | `pkg/agent/packetcapture/capture/*_test.go` | Yes (unit + generated testdata) |

This audit prioritized unit tests that encode CNI/IPAM contracts, because they are reproducible on a single machine and match Antrea’s existing fake-client patterns.
