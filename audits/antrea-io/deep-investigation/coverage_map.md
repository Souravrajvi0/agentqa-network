# Coverage map

**Upstream SHA:** `3aca3e73e6d5461146b748eb7e5a31c4b7576ee3`  
**Depth:** Deep on IPAM/CNI; sampled elsewhere per investigation passes.

## Investigated (read + trace)

| Package / subsystem | Depth | Notes |
|---|---|---|
| `pkg/ipam/poolallocator` | Deep | `initIPAllocators`, AllocateNext, status patch — **bug 001** |
| `pkg/ipam/ipallocator` | Medium | CIDR vs range allocators |
| `pkg/agent/cniserver/ipam` | Deep | Add/Del/Secondary — **bug 002** |
| `pkg/agent/cniserver` | Medium | ADD rollback, lock |
| `pkg/controller/ipam` | Light | `updateIPPoolCounters`, StatefulSet usage |
| `pkg/controller/externalippool` | Light | Compared to #7868 |
| `pkg/controller/networkpolicy` | Light | hostNetwork exclusion, membership |
| `pkg/agent/controller/networkpolicy` | Light | sync path sketch |
| `pkg/agent/proxy` | Light | EndpointSlice controller entry points |
| `pkg/flowaggregator` | Light | throughput math guards |
| `pkg/agent/flowexporter` | Skim | export pipeline |
| `pkg/agent/secondarynetwork` | Medium | call into SecondaryNetworkAllocate |
| `docs/antrea-ipam.md` | Full | gateway non-allocatable |
| `test/e2e/antreaipam_test.go` | Skim | immutability, not gateway range |
| `test/e2e/secondary_network_ipam_test.go` | Skim | dual-stack NAD, not multiv4 secondary |

## Not investigated (remaining risk)

- `pkg/agent/openflow/*` full churn / orphan flow deletion under rapid NP updates
- Windows agent (`pkg/agent/windows`)
- `multicluster/` stretched enforcement end-to-end
- BGP / ServiceExternalIP / Egress failover with memberlist
- PacketCapture BPF filter parity (`pkg/agent/packetcapture`) — LFX #7701 scope
- Full Antrea Proxy corner cases (headless, dual-stack transitions)
- Node IPAM controller (`pkg/controller/nodeipam`) allocation edge cases
- Live `test/e2e` execution on a cluster

## Functions explicitly reviewed

- `IPPoolAllocator.initIPAllocators` — `allocator.go:121-154`
- `AntreaIPAM.Add` — `antrea_ipam.go:206-272`
- `AntreaIPAM.SecondaryNetworkAllocate` — `antrea_ipam.go:372-429`
- Flow aggregator record merge — `aggregate.go` (duration guards)
- ExternalIPPool gateway handling — cross-ref #8531 / #7868

## Test artifacts added (research repo only)

- `reproductions/ippool-gateway-in-range/`
- `reproductions/secondary-ipam-same-family/`

Regression tests were run locally against unmodified allocator sources; test code lives under `reproductions/`, not in upstream tree at end of audit.