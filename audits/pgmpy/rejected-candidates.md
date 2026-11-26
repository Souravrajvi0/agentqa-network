# Rejected candidates

| ID | Why |
|---|---|
| LGBN `simulate(do=)` absorbing X into child intercepts | Correct for linear Gaussian; not a do-calculus error |
| LGBN-003 beta length | Hard fail in `to_joint_gaussian`, not a wrong number |
| SHD node mismatch | Raises; #2094 closed |
| VE MAP as independent argmax of margins | Implementation uses joint `argmax` |
| DBN query vs sampling | In-tree TODO; not independently proven |
| CausalInference IV TODO | Test comment; not re-validated |
| `Independencies.get_factorized_product` | Unimplemented stub, not a wrong answer |
