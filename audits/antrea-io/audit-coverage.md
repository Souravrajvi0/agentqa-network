# Phase 2/3 — Audit coverage

Revision audited: `antrea-io/antrea@3aca3e73e`.

## Traced paths

| Path | Files | Depth | Outcome |
|---|---|---|---|
| IPPool CIDR / range allocation | `pkg/ipam/poolallocator/allocator.go`, `pkg/ipam/ipallocator/allocator.go` | Full init → AllocateNext → status | **Bug A**: gateway not reserved for start/end ranges |
| Primary AntreaIPAM ADD/DEL/CHECK | `pkg/agent/cniserver/ipam/antrea_ipam.go` | owns → AllocateNext → rollback defer | Same-family skip present; DEL by container+IFName |
| Secondary AntreaIPAM allocate | `SecondaryNetworkAllocate` | All listed pools | **Bug B**: no same-family skip after success |
| CNI ADD rollback / DEL order | `pkg/agent/cniserver/server.go` | CmdAdd defer cmdDel; Del iface then IPAM | No new permanent leak proven; SR-IOV retry documented |
| IPPool usage counters | `appendPoolUsage*` vs `AntreaIPAMController.updateIPPoolCounters` | Status | Eventual; rejected |
| ExternalIPPool gateway | `pkg/controller/externalippool/controller.go` | CIDR reservedIPs = broadcast only | Duplicate of open [#7868](https://github.com/antrea-io/antrea/issues/7868) / PR [#8531](https://github.com/antrea-io/antrea/pull/8531) |
| NP AppliedTo / AddressGroup | `networkpolicy_controller.go`, `crd_utils.go` | HostNetwork / terminated / no-IP filters | Consistent with docs |
| IPBlock except admission | `validate.go` `validateIPBlock` | Strict subset | No new bug |
| PacketCapture BPF | `pkg/agent/packetcapture/capture/bpf.go` | IPv6 fragment vs transport | Covered by LFX #7701; not re-filed |
| FQDN cache | `pkg/agent/controller/networkpolicy/fqdn.go` | regex cache | Invalid regex cached as nil; not unbounded proof |
| Agent–Controller skew | API watch | Qualitative | No repro of permanent divergence |

## Not fully exercised

- Multi-node encap/tunnel endpoint selection (needs Kind/e2e).
- Live OVS flow stale after endpoint delete (needs integration).
- Windows CNI paths.
- Multicluster stretched NP.
- L7 NP and AdminNetworkPolicy dataplane.

Absence of a finding in those areas is **not** a proof of correctness.

## Tests executed on this machine

```
go test ./pkg/ipam/poolallocator/ -run TestAllocateNextSkipsGatewayInIPRange
go test ./pkg/agent/cniserver/ipam/ -run TestSecondaryNetworkAllocateAtMostOneIPPerFamily
```

Go 1.26 host used `GOTOOLCHAIN=auto` to fetch the 1.27 toolchain. Both new tests **failed on unpatched main**, which is the reproduction. See `reproductions/`.
