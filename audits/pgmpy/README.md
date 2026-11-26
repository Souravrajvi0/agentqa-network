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

Reproduced on unmodified `dev` at this SHA:

1. **PGMPY-LGBN-001** — `LinearGaussianBayesianNetwork.do` mutilates edges only; CPDs and `to_joint_gaussian` stay observational. Duplicate of open [#2714](https://github.com/pgmpy/pgmpy/issues/2714).
2. **PGMPY-LGBN-002** — `LinearGaussianBayesianNetwork.copy` drops variable roles. Open [#3746](https://github.com/pgmpy/pgmpy/issues/3746).
3. **PGMPY-CPD-001** — `TabularCPD` list shape mismatch raises `AttributeError`; `_str` inverts `super()`. Open [#3744](https://github.com/pgmpy/pgmpy/issues/3744).
4. **PGMPY-ID-001** — `Adjustment.validate` accepts mediators/colliders. Open [#3553](https://github.com/pgmpy/pgmpy/issues/3553).
5. **PGMPY-LGBN-003** — mismatched `beta` length passes `check_model()` then crashes in `to_joint_gaussian()`.
6. **PGMPY-FBN-001** — `FunctionalBayesianNetwork.copy` is `DiscreteBayesianNetwork.copy` (static inherit check; live `copy()` not run without torch).
7. **PGMPY-FD-001** — `Frontdoor._validate` uses only `exposures[0]` / `outcomes[0]`.
