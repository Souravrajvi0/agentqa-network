# GitHub deduplication

**Search date:** 2026-11-26  
**Target commit:** `3aca3e73e` on `main`  
**Method:** GitHub MCP / issue search for keywords below (not exhaustive full-text of all issues).

## ANTREA-IPAM-001 (gateway in IPPool start/end range)

| Query / item | Result |
|---|---|
| `gateway IPPool range` | #7868 discusses **ExternalIPPool** CIDR gateway allocation |
| PR #8531 | ExternalIPPool CIDR gateway reserve |
| IPPool `start` `end` gateway | **No issue found** for `poolallocator` range path |
| Classification | **Previously unreported candidate** (related but distinct from #7868) |

Note: #7868 workaround text suggested start/end ranges; this audit shows that workaround is also incorrect for gateway-in-range.

## ANTREA-IPAM-002 (secondary multiple IPv4)

| Query / item | Result |
|---|---|
| `SecondaryNetworkAllocate` | No hits |
| secondary network multiple IP pool | #7722 — IPv6 secondary **feature**, not multiv4 bug |
| `multiv4` secondary | No issue |
| Classification | **Previously unreported candidate** |

## Known related (not our findings)

| ID | Topic | Relation |
|---|---|---|
| #7306 | Overlapping IPPools | Closed; candidacy only |
| #7307 | start > end validation | Validation gap |
| #7701 | PacketCapture BPF | Mentorship |
| #6861, #6976 | LFX / mentorship | Context |

## Deduplication incomplete

Full-text search of every closed issue was **not** performed. Human maintainer search for `NewIPRangeAllocator` + `gateway` recommended before filing.