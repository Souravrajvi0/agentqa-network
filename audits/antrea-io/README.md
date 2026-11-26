# Antrea correctness audit (antrea-io/antrea)

Investigation only. No patches were pushed to `antrea-io/antrea`.

| Deliverable | File |
|---|---|
| Repo scope / mentorship | [repository-selection.md](repository-selection.md) |
| Architecture | [architecture.md](architecture.md) |
| Invariants | [network-invariants.md](network-invariants.md) |
| Coverage | [audit-coverage.md](audit-coverage.md) |
| Candidate list | [candidates.json](candidates.json) |
| Confirmed bugs | [confirmed-bugs.md](confirmed-bugs.md) |
| Rejected | [rejected-candidates.md](rejected-candidates.md) |
| Dedup | [github-dedup.md](github-dedup.md) |
| Repros | [reproductions/](reproductions/) |
| Roadmap | [contribution-roadmap.md](contribution-roadmap.md) |

Confirmed (high confidence):

1. **A** — IPPool start/end ranges allocate the gateway.
2. **B** — Secondary AntreaIPAM allocates from every same-family pool.
