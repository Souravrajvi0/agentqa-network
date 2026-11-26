# Network and CNI invariants (from docs + API)

These are the contracts used to judge bugs. Quotes are paraphrases of `docs/antrea-ipam.md` and in-tree comments unless noted.

## CNI

1. ADD must be retry-safe: a retried ADD for the same container/interface must not leak a second IP.
2. DEL must release IPs allocated for that container (CNI spec: DEL is idempotent).
3. Failed ADD must roll back allocation and interfaces (Agent `CmdAdd` rollback).
4. At most one IPv4 and one IPv6 from AntreaIPAM **primary** path, even when multiple pools of the same family are listed (comment on `AntreaIPAM.Add`; unit test `multiv4-1`). Extra same-family pools are **fallback when exhausted**, not extra addresses.
5. Requested static Pod IPs (`ipam.antrea.io/pod-ips`): at most one address per family; at most one pool per family for that request (docs, v2.7+).

## IPPool

6. CIDR range: first address (network) is never allocated; IPv4 broadcast is excluded when `prefixLength` equals the CIDR mask; **gateway is always excluded**. Capacity `TOTAL` is allocator capacity, capped at 65,536 candidates per range.
7. Start/end range: start and end **are** allocatable **except if one of them corresponds to the gateway** (`docs/antrea-ipam.md` § IPPool CRD).
8. `status.ipAddresses` is the source of truth for allocation; `status.usage` may lag until the Controller counter loop patches it (eventual).
9. StatefulSet reserved IPs stay reserved across Pod restart; released only when the StatefulSet is deleted.

## NetworkPolicy / AntreaPolicy

10. HostNetwork Pods are not AppliedTo members and are not AddressGroup members (use `nodeSelector` for Node IPs).
11. Empty `podSelector` matches all Pods in the selected Namespaces (Kubernetes NP semantics).
12. `ipBlock.except` must be a strict subset of `cidr` (admission).
13. Policy realization is eventually consistent; Agents reconnect and resync after restart. Permanent wrong membership after cache sync is a bug; brief lag is not.

## Secondary IPAM

14. NAD `ipam.ippools` may list IPv4 and IPv6 pools for dual-stack (docs examples: one pool per family).
15. Exhausted pool of a family should fall through to the next pool of that family (implemented `ErrPoolExhausted` continue). After a successful allocation for a family, further pools of that family should not take another address if the same-family cap from (4) is intended to apply to secondary as well. Primary tests encode that cap; secondary `Add` comments do not. This audit treats **primary’s tested contract** as the intended AntreaIPAM behavior for the shared driver.

## Diagnostics

16. PacketCapture BPF is specified to mimic tcpdump/libpcap (LFX 2026 #7701). Discrepancies belong to that existing workstream unless they cause a documented CRD filter to capture the wrong traffic with a unit-testable proof.

## Not treated as bugs

- `status.usage` lag after StatefulSet reserve/release until `updateIPPoolCounters`.
- DEL retry while OVS/SR-IOV detach is in progress.
- Policy flow churn during informer catch-up.
