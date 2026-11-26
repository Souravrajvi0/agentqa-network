# skpro architecture (distributions focus)

## Layering

1. **`BaseDistribution`** (`distributions/base/_base.py`) — public API, `_boilerplate`, coercion to pandas/numpy, default fallbacks for missing methods.
2. **`_ScipyAdapter`** — thin wrapper over `scipy.stats` RVs with broadcasting via `_bc_params`.
3. **Native implementations** — `Normal`, `Laplace`, `QPD_*`, `Empirical`, etc.
4. **Composites** — `Mixture`, `MeanScale`, `TruncatedDistribution`, `Hurdle`, `ZeroInflated`, `TransformedDistribution`, `IID`, `KernelMixture`.

## Broadcasting model

Constructor tag `broadcast_init: on` triggers `_get_bc_params_dict` to expand parameter arrays to `(n_rows, n_cols)`. Scalar distributions use `ndim == 0`, `shape == ()`.

**Pain point:** `_coerce_to_self_index_df` handles scalars; `_coerce_to_self_index_np` does not ([#673](https://github.com/sktime/skpro/issues/673)).

## Method resolution

| Method | Typical resolution |
|--------|------------------|
| `pdf` | `_pdf` or `exp(log_pdf)` or diff `cdf` |
| `cdf` | `_cdf` or Monte Carlo sample indicators |
| `ppf` | `_ppf` or bisect on `cdf` |
| `surv` | `_surv` default `1 - cdf` |
| `haz` | `pdf / surv` |
| `mean` | `_mean` or quadrature on `ppf` |

Composites override selectively; capability tags (`capabilities:exact`) drive warnings when approximations are used.

## Downstream consumers

- `skpro.regression.*` — `predict_proba` returns `BaseDistribution` objects.
- `skpro.metrics.*` — CRPS uses `energy()`.
- `skpro.survival.*` — wraps regressors; depends on distribution tail behavior for hazards.