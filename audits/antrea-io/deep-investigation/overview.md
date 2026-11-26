# Executive summary

**Upstream:** [antrea-io/antrea](https://github.com/antrea-io/antrea)  
**Revision:** `3aca3e73e6d5461146b748eb7e5a31c4b7576ee3` (`main`, 2026-11-24)  
**Investigation host:** Private worker with local checkout `/home/ec2-user/workspace/antrea`  
**Research artifacts (no antrea source edits committed):** `audits/antrea-io/deep-investigation/`

## Outcome

| Category | Count |
|---|---|
| Validated correctness bugs | 2 |
| Candidates needing maintainer confirmation | 1 |
| Rejected / duplicate / out of scope | 12+ hypotheses |

Both validated bugs are in **AntreaIPAM**: one in the shared pool allocator (start/end ranges), one in the agent CNI IPAM driver (secondary networks). Each has a **failing unit test on unmodified `main`** at this SHA. No automatic upstream issues or PRs were created.

## Validated findings (short)

1. **ANTREA-IPAM-001 (Category A):** `IPPool` start/end ranges can assign `subnetInfo.gateway` to a Pod. CIDR ranges already reserve the gateway.
2. **ANTREA-IPAM-002 (Category B):** `SecondaryNetworkAllocate` can assign one IPv4 from each listed IPv4 pool. Primary `Add()` already caps at one address per family (`multiv4-1` test).

## Investigation scope

Multi-pass review covered architecture mapping, IPAM/CNI lifecycle, controller NetworkPolicy membership rules, ExternalIPPool allocation, flow aggregator throughput math, Antrea Proxy EndpointSlice handling, and CRD conversion tests. **Not** exhaustively audited: full OVS flow lifecycle on churn, multicluster stretched policy, Windows agent paths, live e2e clusters, or BGP/L7 policy dataplane.

## Recommended next steps for contributors

1. Land regression tests from `reproductions/`.
2. Small fixes in `poolallocator` and `antrea_ipam.go` (see `contribution_strategy.md`).
3. After maintainer ack, open issues on `antrea-io/antrea` (gateway range is distinct from open #7868 for ExternalIPPool CIDR).

See `validated_bugs.md` and `findings.json` for full evidence.