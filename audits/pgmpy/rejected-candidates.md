# Rejected / deferred candidates

| ID | Why |
|---|---|
| LGBN `simulate(do=)` absorbing X into child intercepts | Correct for linear Gaussian; not a do-calculus error |
| SHD node mismatch | Raises `ValueError` on current `dev`; #2094 closed |
| VE MAP as independent argmax of margins | Implementation uses joint `argmax` |
| DBN query vs sampling | In-tree TODO; not independently proven |
| CausalInference IV TODO | Test comment; deferred (unvalidated) |
| `Independencies.get_factorized_product` | Unimplemented stub, not a wrong answer |
