# Confirmed bugs

Upstream `pgmpy/pgmpy@9f61170f42cbbe72b597823c236c53cd46fae7f8`. Repros in `reproductions/`.

## PGMPY-LGBN-001 (novel) — high

`LinearGaussianBayesianNetwork.do` inherits `DAG.do`: copy + drop incoming edges. Discrete BN overrides `do` to replace CPDs; LGBN does not.

- After `do(["x2"])`, `P(x2 | x1)` remains; `check_model()` raises; `to_joint_gaussian()` mean equals the observational mean.
- `simulate(do={"x2": 0.0})` is implemented separately and is consistent with Pearl for linear Gaussian.

## PGMPY-LGBN-002 — high, open #3746

`copy()` rebuilds nodes/edges/CPDs and never copies `get_role_dict()`. `DAG.copy` and `DiscreteBayesianNetwork.copy` do.

## PGMPY-CPD-001 — high, open #3744

Shape mismatch uses `values.shape` (list has no `.shape`). `_str` calls `super(self, TabularCPD)`.

## PGMPY-ID-001 — high, open #3553

`_validate` checks parents-of-exposure vs outcome. No parents ⇒ `all([])` is True. Mediator `X→M→Y` with `adjustment=[M]` validates.

## PGMPY-FBN-001 (novel) — high (by code)

`FunctionalBayesianNetwork.copy` is `DiscreteBayesianNetwork.copy`: `DiscreteBayesianNetwork()` + `cpd.copy()`. `FunctionalCPD` has no `copy`; `add_cpds` rejects non-`TabularCPD`. Constructor also requires torch/pyro, so the live path was not executed in this environment; the inherit/API mismatch is on `dev`.
