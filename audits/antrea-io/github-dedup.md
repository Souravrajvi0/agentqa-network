# Phase 4 — GitHub deduplication

Queries run against `antrea-io/antrea` (issues + PRs) on 2026-11-26. Revision `3aca3e73e`.

## ANTREA-IPAM-001 (IPPool range + gateway)

| Query | Result |
|---|---|
| `repo:antrea-io/antrea gateway IP range IPPool allocate` | Hit **#7868** ExternalIPPool CIDR gateway — different CRD and CIDR path |
| `repo:antrea-io/antrea IPPool gateway reserved range` | 0 issues |
| `repo:antrea-io/antrea IPPool gateway start end range allocate` (PRs) | **PR #8531** ExternalIPPool gateway exclusion — not IPPool `initIPAllocators` range branch |
| Closed #7461, #7307 | CIDR vs prefixLength validation; start>end validation — not gateway reservation |
| Code search `NewIPRangeAllocator` + reserved | Range constructor has no reserved-IP argument |

**Verdict:** not a duplicate of #7868. Same *theme* (gateway must not be a workload IP), different allocator and CRD. #7868’s suggested workaround (“use a range instead of a CIDR”) would still allocate the gateway on **IPPool** ranges — extra reason to treat 001 as new.

## ANTREA-IPAM-002 (secondary same-family pools)

| Query | Result |
|---|---|
| `repo:antrea-io/antrea secondary network IPAM multiple pools same family` | 0 issues |
| `SecondaryNetworkAllocate` / “at most one” IPAM | Primary-only comments and tests in `antrea_ipam.go` / `antrea_ipam_test.go`; no issue/PR for secondary skip |
| Broader secondary IPAM issues | Unrelated (NAD, SR-IOV, VLAN) |

**Verdict:** previously unreported relative to public issues/PRs searched.

## Intentionally not filed

| Item | Duplicate / reason |
|---|---|
| ExternalIPPool CIDR gateway | #7868, PR #8531 |
| PacketCapture BPF vs tcpdump | #7701 (LFX 2026) |
| PacketCapture IPv6 filters | #6861 / #6976 (LFX 2025) |
