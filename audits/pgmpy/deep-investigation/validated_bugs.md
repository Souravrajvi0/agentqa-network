# Validated bugs

See parent [`../confirmed-bugs.md`](../confirmed-bugs.md) and [`../reproductions/`](../reproductions/).

**PGMPY-LGBN-001** (open [#2714](https://github.com/pgmpy/pgmpy/issues/2714)): `LinearGaussianBayesianNetwork.do` only drops incoming edges and leaves CPDs unchanged. Proposed (untested) remedy: override `do` analogously to discrete `do`. Not verified here that `N(value, 0)` passes `check_model` / `to_joint_gaussian` or matches `simulate(do=...)`.
