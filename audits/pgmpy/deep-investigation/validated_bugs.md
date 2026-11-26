# Validated bugs

See parent `confirmed-bugs.md` and `reproductions/`.

Primary novel finding to contribute: **PGMPY-LGBN-001** — override `LinearGaussianBayesianNetwork.do` analogously to discrete `do` (replace intervened CPD with `N(value, 0)` or a user CPD; drop incoming edges; keep child CPDs). Then `check_model` and `to_joint_gaussian` match `simulate(do=...)`.
