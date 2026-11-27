# GitHub dedup

Searched `repo:pgmpy/pgmpy` issues (open/closed) for copy, do, TabularCPD, Adjustment.validate, FunctionalBayesianNetwork, SHD, Frontdoor, LinearGaussianCPD, beta, check_model.

Beta-length vs `check_model`: no issue reports `check_model()` returning True on a short/long `beta`. Closed [#3118](https://github.com/pgmpy/pgmpy/issues/3118) mentions beta length only as a notebook-docs checklist item.

| Finding | Upstream |
|---|---|
| LGBN.do CPD / joint | Open [#2714](https://github.com/pgmpy/pgmpy/issues/2714) |
| LGBN copy roles | Open [#3746](https://github.com/pgmpy/pgmpy/issues/3746) (same as Discrete #3245 / #3410) |
| TabularCPD shape / super | Open [#3744](https://github.com/pgmpy/pgmpy/issues/3744) |
| Adjustment.validate forbidden set | Open [#3553](https://github.com/pgmpy/pgmpy/issues/3553) |
| FunctionalBN.copy | **No matching issue** |
| Frontdoor first-pair only | **Filed** [#3754](https://github.com/pgmpy/pgmpy/issues/3754) |
| LGBN beta length vs check_model | **Filed** [#3753](https://github.com/pgmpy/pgmpy/issues/3753) |
| SHD node sets | Closed [#2094](https://github.com/pgmpy/pgmpy/issues/2094); `reproductions/test_shd_unequal_nodes.py` — `ValueError` on unequal node sets |
