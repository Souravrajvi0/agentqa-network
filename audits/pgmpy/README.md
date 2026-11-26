# pgmpy correctness audit (pgmpy/pgmpy)

Investigation only. No patches were pushed to `pgmpy/pgmpy`.

| Deliverable | File |
|---|---|
| Repo scope | [repository-selection.md](repository-selection.md) |
| Architecture | [architecture.md](architecture.md) |
| Invariants | [invariants.md](invariants.md) |
| Coverage | [audit-coverage.md](audit-coverage.md) |
| Candidate list | [candidates.json](candidates.json) |
| Confirmed bugs | [confirmed-bugs.md](confirmed-bugs.md) |
| Rejected | [rejected-candidates.md](rejected-candidates.md) |
| Dedup | [github-dedup.md](github-dedup.md) |
| Repros | [reproductions/](reproductions/) |
| Deep investigation | [deep-investigation/](deep-investigation/) |

**Upstream:** [pgmpy/pgmpy](https://github.com/pgmpy/pgmpy)  
**Revision:** `9f61170f42cbbe72b597823c236c53cd46fae7f8` (`dev`, 2026-11-21)

Validated on unmodified `dev` at this SHA:

1. **PGMPY-LGBN-001** — `LinearGaussianBayesianNetwork.do` mutilates edges only; CPDs and `to_joint_gaussian` stay observational.
2. **PGMPY-LGBN-002** — `LinearGaussianBayesianNetwork.copy` drops variable roles (also `do()`, `with_role(..., inplace=False)`). Matches open #3746.
3. **PGMPY-CPD-001** — `TabularCPD` list shape mismatch raises `AttributeError`; `_str` inverts `super()` arguments. Matches open #3744.
4. **PGMPY-ID-001** — `Adjustment.validate` accepts mediators/colliders (vacuous `all([])` when exposure has no parents). Matches open #3553.
5. **PGMPY-FBN-001** — `FunctionalBayesianNetwork` inherits `DiscreteBayesianNetwork.copy`, which instantiates the wrong class and calls missing `FunctionalCPD.copy`.
