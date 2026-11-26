# Coverage

| Area | Files | Depth | Result |
|---|---|---|---|
| LGBN copy / do / joint Gaussian | `models/LinearGaussianBayesianNetwork.py` | Function + repro | PGMPY-LGBN-001 (#2714), 002, 003 |
| Discrete BN copy / do | `models/DiscreteBayesianNetwork.py` | Compared as control | Roles + CPDs OK |
| TabularCPD init / `_str` | `factors/discrete/CPD.py` | Repro | PGMPY-CPD-001 |
| Adjustment identify/validate | `identification/adjustment.py` | Repro | PGMPY-ID-001 (open #3553) |
| Functional BN copy | `models/FunctionalBayesianNetwork.py`, `factors/hybrid/FunctionalCPD.py` | Static inherit | PGMPY-FBN-001 (not live-executed) |
| ID algorithm | `identification/ID.py` | Read | No new bug proven |
| Frontdoor | `identification/frontdoor.py` | Read | PGMPY-FD-001: only first exposure/outcome |
| SHD | `metrics/shd.py` | Repro (`test_shd_unequal_nodes.py`) | Unequal node sets raise `ValueError`; #2094 closed |
| VE / BP MAP | `inference/ExactInference.py` | Read | Joint argmax, not max-marginals |
| DBN query vs sampling | tests TODO | Known in-tree | Not re-filed |
| SEM IV | `tests/test_inference/test_CausalInference.py` TODO | Not re-validated | Deferred (unvalidated) |

Not exhaustively audited: PC/GES orientation completeness, EM with missingness MNAR, MAG/PAG algorithms, Pyro SVI fit, full BIF round-trip.
