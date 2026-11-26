# Audit coverage (skpro)

| Module | Depth | Notes |
|--------|-------|-------|
| `distributions/base` | Deep | surv/haz, coercion, defaults |
| `distributions/*` parametric | Medium | Spot checks + scan script |
| `distributions/adapters/scipy` | Light | Assumes SciPy correctness |
| `mixture`, `meanscale`, `truncated`, `hurdle`, `zeroinflated` | Deep | Known high-impact bugs |
| `trafo/TransformedDistribution` | Light | Issue #1186 not fully re-derived |
| `compose/IID`, `KernelMixture` | Light | Warnings only for non-zero kernel mean |
| `regression` | Light | Interface review; no new estimator bugs filed |
| `survival` | Light | Censoring API; tail depends on distributions |
| `metrics` | Read-only | CRPS via `energy` |
| `libs/cyclic_boosting` | Not in scope | QPD delegates externally |

**Distribution classes enumerated:** all exports in `skpro.distributions` with `get_test_params` (~62).

**Tests executed:** custom reproduction scripts (not full upstream pytest suite — runtime + CI scope).