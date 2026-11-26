# sktime — confirmed correctness findings

Audit revision: sktime `c2be801ec7c3183457c2ec9bd7109266a41d9e35`  
Environment: Python 3.11, editable install from source.

## Ranked validated defects

| ID | Severity | Confidence | Title |
|----|----------|------------|-------|
| [SKTIME-RED-001](#sktime-red-001) | **High** | High | Recursive reduction edge-pads missing future exogenous rows |
| [SKTIME-SPLIT-001](#sktime-split-001) | **High** (API footgun) | High | Positive int `fh` → `1..n`; `n ≥ len(y)` yields empty train + polluted test |
| [SKTIME-FH-001](#sktime-fh-001) | **Medium** | High | Irregular `DatetimeIndex` + integer relative `fh` → opaque `TypeError` |
| SKTIME-FH-002 | Low | Medium | Related freq/`_shift` failures (see [#4159](https://github.com/sktime/sktime/issues/4159)) |

---

### SKTIME-RED-001

**Title:** Recursive tabular reduction silently edge-pads short future `X`, producing incorrect forecasts.

**Root cause group:** *Recursive strategy exogenous assembly* (`compose/_reduce.py` numpy path).

| Field | Detail |
|-------|--------|
| **Location** | `sktime/forecasting/compose/_reduce.py` lines **1103–1112** (`np.pad(..., mode="edge")`) |
| **Root cause** | Future exogenous rows are concatenated from `X.iloc[-(last.shape[2] - window_length):]`. When fewer than `fh_max` future rows exist, the matrix is **edge-padded** instead of failing or requiring explicit future values. |
| **Expected** | `predict` should require sufficient future `X` for the horizon (as direct/multioutput effectively do), or raise a clear error. |
| **Actual** | Forecasts change materially vs full `X` with no warning (`[20., 20.7, 21.37]` vs `[20., 19.7, 19.27]` on synthetic data). |
| **Severity** | **High** — silent wrong answers in production pipelines with partial exogenous data. |
| **Confidence** | High (reproduced; direct strategy unaffected). |
| **Duplicate** | No GitHub issue found (`np.pad` / short exogenous search empty). |
| **Proposed fix** | If `X.shape[0] < window_length + fh_max - 1`, raise `ValueError` with required row count; optionally add `allow_edge_pad=False` default `False`. Add regression in `compose/tests/test_reduce.py`. |
| **Repro** | `audits/sktime/reproductions/test_recursive_short_X_edge_pad.py` |
| **Failing test** | `test_recursive_edge_pad_changes_forecasts_when_future_X_short` (asserts desired fix). |

---

### SKTIME-SPLIT-001

**Title:** Integer `fh=n` is coerced to relative steps `1..n`; when `n ≥ len(y)`, `ForecastingHorizonSplitter` returns **zero training indices** and test indices including **t=0**.

**Root cause group:** *Integer `fh` semantics shared by `check_fh`, splitters, CV*.

| Field | Detail |
|-------|--------|
| **Location** | `sktime/forecasting/base/_fh.py` `_check_values` (int → `range(1,n+1)`); `sktime/split/fh.py` `_split` lines **76–84**; `sktime/split/temporal_train_test_split.py` (delegates to splitter). |
| **Root cause** | Positive int `fh` means “all relative horizons up to n”, not “n-step-ahead only” or “test size n”. Split math uses `n_train = len(y) - max_step`. |
| **Expected** | Hold-out split with at least one training point; test indices should be out-of-sample relative to series end for benchmark use. |
| **Actual** | `len(y)=10`, `fh=10` → `train=[]`, `test=[0..9]`. `fh=9` → `train=[0]`, `test=[1..9]`. |
| **Severity** | **High** as footgun for `temporal_train_test_split(y, fh=k)` and grid search defaults. |
| **Confidence** | High. |
| **Duplicate** | No dedicated issue; behavior follows from documented relative semantics but lacks guards. |
| **Proposed fix** | (1) `ValueError` if `n_train < 1` or if test contains index `< n_train`. (2) Consider `fh=int` meaning single step `n` **only** in splitter API (breaking) or add `fh_max_only` parameter. (3) Document prominently in `temporal_train_test_split`. |
| **Repro** | `audits/sktime/reproductions/test_fh_splitter_empty_train.py` |

---

### SKTIME-FH-001

**Title:** Integer relative `ForecastingHorizon` on irregular `DatetimeIndex` (no `freq`) crashes in `_to_absolute` with `int * NoneType`.

**Root cause group:** *Datetime freq inference / horizon arithmetic*.

| Field | Detail |
|-------|--------|
| **Location** | `sktime/forecasting/base/_fh.py` **943–947** (`return r * to_offset(fh.freq)` when `fh.freq` is `None`). |
| **Root cause** | Datatypes allow irregular series; `ForecastingHorizon` stores `freq=None`; `_to_absolute` multiplies integer steps by `to_offset(None)`. |
| **Expected** | Infer step from median index diffs, coerce to timedelta `fh`, or raise actionable error at `fit`/`predict`. |
| **Actual** | `NaiveForecaster.fit` succeeds; `predict(fh=[1,2])` raises `TypeError`. |
| **Severity** | **Medium** — irregular series are common; error is non-actionable. |
| **Confidence** | High. |
| **Duplicate** | Partial overlap with open [#4159](https://github.com/sktime/sktime/issues/4159) (reducer / panel); this is a **minimal univariate** path via `NaiveForecaster`. |
| **Proposed fix** | In `_check_freq` / `fit`, require freq or timedelta-relative `fh` for datetime cutoffs; improve error message to cite `infer_freq` or pass `freq=` on `ForecastingHorizon`. |
| **Repro** | `audits/sktime/reproductions/test_irregular_datetime_fh.py` |

---

## Architectural weaknesses (not all validated as bugs)

Grouped by shared root cause for contribution planning.

### A. Temporal evaluation & leakage

- `evaluate(..., cv_global=…)` without `cv_global_temporal` — documented cross-series temporal leakage (`model_evaluation/_functions.py` ~642–645). **Enhancement:** warn or default temporal split.
- `ForecastingHorizonSplitter` / negative relative `fh` — explicit leakage note (`split/fh.py` ~40–42); OK if intentional.
- `FitInTransform` — fits on transform batch (`transformations/compose/_fitintransform.py`); documented; pipelines should warn or forbid in forecasting tags.

### B. Reduction & global pooling

- `RecursiveReductionForecaster` (`pooling="global"`) — `tests:skip_all` (#7380); unaudited in CI.
- `MCRecursiveProbaReductionForecaster` — index/column alignment helpers (`_reduce_proba.py`); high complexity, moderate test depth.

### C. Probabilistic defaulting

- Multivariate quantiles from intervals — regression in `test_base_bugs.py` (likely fixed on main).
- Hierarchical `predict_proba` via vectorization — thinner coverage than point forecasts.

### D. Skipped / known-broken estimators (`tests:skip_all`)

| Estimator | Issue ref |
|-----------|-----------|
| `mapa.py` | #8039 |
| `scinet.py` | #7871 |
| `enbpi.py`, `momentfm.py`, `prophetverse.py` | #10083 |
| `RecursiveReductionForecaster` | #7380 |

### E. Reconciliation

- `ReconcilerForecaster` uses `predict` instead of `predict_residuals` for hierarchical residuals (`reconcile.py` ~237–241, comment “bug”); **needs dedicated repro** before filing.

---

## Contribution sizing

### Small (1–3 days each)

- SKTIME-RED-001 guard + regression test.
- SKTIME-SPLIT-001 validation + docs.
- SKTIME-FH-001 error message + optional inference.
- Add splitter tests for `fh` int boundaries.

### Medium (1–2 weeks each)

- Recursive exogenous API: explicit “known futures” length validation across strategies.
- `FhPlexForecaster` `fh_contiguous=True` tuning metric isolation.
- Adapter harmonization: `to_indexer(from_cutoff=…)` audit pmdarima vs statsforecast vs skforecast.

### Major (ESoC / multi-week)

1. Horizon & irregular-time subsystem (timedelta fh, `to_indexer` implementation, freq registry).
2. Temporal benchmarking harness (safe defaults, leakage detectors, panel/hier split invariants).
3. Probabilistic forecasting compliance suite (reduction sampling, hierarchical intervals).
4. Restore CI for `tests:skip_all` forecasters with targeted bug fixes.