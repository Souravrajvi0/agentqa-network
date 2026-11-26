# Coverage

| Area | Files | Depth | Result |
|---|---|---|---|
| LGBN copy / do / joint Gaussian | `models/LinearGaussianBayesianNetwork.py` | Function + repro | PGMPY-LGBN-001, 002 |
| Discrete BN copy / do | `models/DiscreteBayesianNetwork.py` | Compared as control | Roles + CPDs OK |
| TabularCPD init / `_str` | `factors/discrete/CPD.py` | Repro | PGMPY-CPD-001 |
| Adjustment identify/validate | `identification/adjustment.py` | Repro | PGMPY-ID-001 (open #3553) |
| Functional BN copy | `models/FunctionalBayesianNetwork.py`, `factors/hybrid/FunctionalCPD.py` | Inspection + inherit | PGMPY-FBN-001 |
| ID algorithm | `identification/ID.py` | Read | No new bug proven |
| Frontdoor | `identification/frontdoor.py` | Read | Single exposure/outcome only (`[0]`); not filed as silent wrong multi-treatment |
| SHD | `metrics/shd.py` | Repro | Different node sets raise; #2094 closed |
| VE / BP MAP | `inference/ExactInference.py` | Read | Joint argmax, not max-marginals |
| DBN query vs sampling | tests TODO | Known in-tree | Not re-filed |
| SEM IV | `tests/test_inference/test_CausalInference.py` TODO | Not re-validated | Rejected |

Not exhaustively audited: PC/GES orientation completeness, EM with missingness MNAR, MAG/PAG algorithms, Pyro SVI fit, full BIF round-trip.
