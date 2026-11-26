# sktime — deep investigation report

See [../confirmed-bugs.md](../confirmed-bugs.md) for full defect write-ups. This document adds **ranking rationale** and **ESoC framing**.

## Methodology

1. Architecture map and centrality ranking (see [../architecture.md](../architecture.md)).
2. High-risk infrastructure first: `ForecastingHorizon`, reduction, splitters, probabilistic defaults.
3. Executable reproductions with expected vs actual behavior.
4. GitHub issue search for duplicates ([../github-dedup.md](../github-dedup.md)).

## Top findings (impact × novelty)

### 1. SKTIME-RED-001 — Silent wrong recursive forecasts (P0)

**Impact:** Any `make_reduction(..., strategy="recursive")` user supplying exogenous `X` who passes only historical rows (or too few future rows) gets **plausible but incorrect** multi-step forecasts.

**Why it slipped through:** Direct/multioutput paths do not use the numpy pad branch; tests typically pass full `X`.

**Fix sketch:**

```python
need = window_length + fh_max  # rows in exogenous tail
if X is not None and X_to_use.shape[1] < need:
    raise ValueError(
        f"recursive predict needs >= {need} exogenous rows for horizon; got {X_to_use.shape[1]}"
    )
```

### 2. SKTIME-SPLIT-001 — `fh=int` and hold-out validity (P0 documentation / P1 code)

**Impact:** `temporal_train_test_split(y, fh=len(y))` is meaningless for supervision (empty train, test includes first observation). Easy to trigger when users pass “forecast horizon length” as int.

**Systemic issue:** `check_fh(10)` → `[1,2,…,10]` is correct for *forecasting* but dangerous for *splitting* without validation.

**Fix sketch:** After `_split`, assert `len(train) >= 1` and `test.min() > train.max()` for relative out-of-sample fh unless `allow_in_sample=True`.

### 3. SKTIME-FH-001 — Irregular time (P1)

**Impact:** Datatypes accept irregular series; core forecast path fails late with cryptic error.

**ESoC angle:** Build a small **index policy layer**: infer regularized index metadata at `fit`, thread through `ForecastingHorizon.freq`, or require timedelta-based relative horizons.

## Grouped root causes

| Root cause | Findings | Contribution type |
|------------|----------|-------------------|
| Integer `fh` = range `1..n` everywhere | SPLIT-001, CV surprises | API + validation |
| Recursive exog window assembly | RED-001 | Bug fix + tests |
| `fh.freq is None` on datetime | FH-001, #4159 | Infrastructure |
| Documented leakage patterns | cv_global, FitInTransform, negative fh | Docs / opt-in strict mode |
| `tests:skip_all` debt | RRF, MAPA, conformal FM | Multi-week CI restoration |

## ESoC proposal sketch (12 weeks)

**Title:** Temporal correctness and safety rails for sktime forecasting

**Milestones:**

1. Horizon contract RFC + backward-compatible validation in splitters and `check_fh`.
2. Recursive/direct exogenous alignment + compliance tests in `test_reduce.py`.
3. Irregular datetime support plan (timedelta `fh` or freq inference).
4. `evaluate` leakage guards + example notebooks updated.
5. Restore one `tests:skip_all` forecaster per milestone (RRF priority).

**Deliverables:** ~25 new regression tests, 3–5 merged PRs upstream, contributor guide section “safe temporal evaluation”.

## Rejected / not validated this pass

| Candidate | Reason |
|-----------|--------|
| Panel recursive vs direct disagree | Different algorithms; no single-step reference checked |
| Reconciler `predict` vs `predict_residuals` | Comment only; no repro executed |
| MASE `sp > len(y_train)` → nan | Documented scaling edge case |
| `FhPlex` metric pollution | Documented CAUTION; not reproduced |