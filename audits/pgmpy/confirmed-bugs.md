# Confirmed bugs

Upstream `pgmpy/pgmpy@9f61170f42cbbe72b597823c236c53cd46fae7f8`. Repros in `reproductions/`.

## PGMPY-LGBN-001 — high, open [#2714](https://github.com/pgmpy/pgmpy/issues/2714)

`LinearGaussianBayesianNetwork.do` inherits `DAG.do`: copy + drop incoming edges. Discrete BN overrides `do` to replace CPDs; LGBN does not.

- After `do(["x2"])`, `P(x2 | x1)` remains; `check_model()` raises; `to_joint_gaussian()` mean equals the observational mean.
- `simulate(do={"x2": 0.0})` is implemented separately and is consistent with Pearl for linear Gaussian.

## PGMPY-LGBN-002 — high, open [#3746](https://github.com/pgmpy/pgmpy/issues/3746)

`copy()` rebuilds nodes/edges/CPDs and never copies `get_role_dict()`. `DAG.copy` and `DiscreteBayesianNetwork.copy` do.

## PGMPY-CPD-001 — high, open [#3744](https://github.com/pgmpy/pgmpy/issues/3744)

Shape mismatch uses `values.shape` (list has no `.shape`). `_str` calls `super(self, TabularCPD)`.

## PGMPY-ID-001 — high, open [#3553](https://github.com/pgmpy/pgmpy/issues/3553)

`_validate` checks parents-of-exposure vs outcome. No parents ⇒ `all([])` is True. Mediator `X→M→Y` with `adjustment=[M]` validates.

## PGMPY-LGBN-003 — medium (validation gap)

`LinearGaussianCPD` does not require `len(beta) == len(evidence) + 1`. `check_model()` still returns True; `to_joint_gaussian()` then raises `ValueError` on broadcast.

## PGMPY-FBN-001 — medium (static inherit; live path not executed)

`FunctionalBayesianNetwork.copy` is `DiscreteBayesianNetwork.copy`: `DiscreteBayesianNetwork()` + `cpd.copy()`. `FunctionalCPD` has no `copy`; discrete `add_cpds` rejects non-`TabularCPD`. Constructor requires torch/pyro; this environment did not run `fbn.copy()`.

## PGMPY-FD-001 — medium (code inspection)

`Frontdoor._validate` uses `get_role("exposures")[0]` and `get_role("outcomes")[0]` only. Multi-treatment graphs are validated against the first pair without error.
