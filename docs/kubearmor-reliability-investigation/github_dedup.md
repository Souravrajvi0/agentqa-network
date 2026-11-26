# GitHub deduplication

Searched 2026-11-26 via `repo:kubearmor/KubeArmor` issue search (cursor-github). No invented PR numbers.

| Finding | Query / issue | Status |
| --- | --- | --- |
| KA-REL-001 MatchExpIdentities | `MatchExpIdentities` | **0 hits** — candidate unreported |
| KA-REL-002 WgDaemon | #2652 WgDaemon ServeLogFeeds BPF teardown | **Open** — same root cause |
| KA-REL-003 monitor StopChan | #2295 context shutdown | **Open enhancement** — related |
| KA-REL-006 policy resync | #3015 updateEvent insert | **Open** |
| KA-REL-007 pod refresher | #2800 reconcile sleep; #2798 metadata | **Open** |
| CRI-O hot loop | #3007 | **Open** |
| Host alert throttle {0,0} | #3014, #3016 | **Open** (feeder; adjacent telemetry) |
| Dropped events | #3052 | **Open** |
| Host policy systemd validate | #3047 | **Open** |

## Classification key

- **Previously unreported:** KA-REL-001 only (in this pass)
- **Known unresolved:** #2652, #3015, #3007, #2800, #2798, #3014, #3016, #3052
- **Related / partial:** #2295, KA-REL-004 (empty reconciler — no exact issue title found)
- **Deduplication incomplete:** Merged PRs for #2652 not verified (issue still open)