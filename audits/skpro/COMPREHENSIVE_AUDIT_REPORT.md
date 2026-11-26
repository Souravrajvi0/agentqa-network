# skpro statistical correctness audit

**Repository:** [sktime/skpro](https://github.com/sktime/skpro)  
**Commit:** `1462eee00d63da399e180fcdfa25fa51bd9d1c95` (`main`)  
**Date:** 2026-11-26  
**Scope:** Probability distributions, composition, base-class numerics, probabilistic regression interfaces (read-only), survival wrappers (read-only).  
**Method:** Static review, GitHub issue/PR deduplication, executable invariant checks vs SciPy, targeted edge-case scripts. No upstream code changes.

---

## Executive summary

skpro’s `BaseDistribution` layer gives a consistent pandas-oriented API for multi-entry distributions, but several **shared base-class defaults** and **composite** types admit silent statistical errors. The generic test suite (`test_all_distrs.py`) checks internal consistency (e.g. `log_pdf` vs `pdf`, shape contracts) but **does not** compare moments to sampling, SciPy references, or tail-stable survival values—so multiple high-impact bugs remain open on `main`.

This audit **confirms two previously unreported defects** on `main`:

1. **Tail survival and hazard collapse** via `surv = 1 - cdf` in `BaseDistribution._surv` (affects every class without a dedicated `_surv`, including `Normal` and `Laplace`).
2. **`TruncatedDistribution` accepts inverted bounds** (`lower > upper`), yielding negative normalization mass and meaningless `cdf`/`pdf`.

It also **reproduces and cites** a cluster of known open issues (Hurdle variance, scalar `Mixture` weights, `MeanScale.mean`, indexing on composites, invalid scale parameters, truncated `ppf` epsilon, scalar 0D vectorization).

**Recommended trajectory:** land small, targeted fixes in `base/_base.py` and `truncated.py`; batch-merge existing PRs for composition bugs; adopt systematic invariant tests (#1239) as an ESoC-style reliability program.

---

## Codebase map (audit focus)

| Area | Path | Role |
|------|------|------|
| Distribution API | `skpro/distributions/base/_base.py` | `pdf`/`cdf`/`ppf`/`surv`/`haz` boilerplate, broadcasting, defaults |
| SciPy bridge | `skpro/distributions/adapters/scipy/_distribution.py` | Delegates to `scipy.stats` RVs |
| Composites | `mixture.py`, `meanscale.py`, `truncated.py`, `hurdle.py`, `zeroinflated.py`, `trafo/_transformed.py` | Composition & truncation |
| Regression | `skpro/regression/base/` | `BaseProbaRegressor`, sklearn adapters |
| Survival | `skpro/survival/base.py` | Censoring API on top of regression |
| Tests | `skpro/distributions/tests/test_all_distrs.py` | Broad contract tests, limited math |

~62 registered distribution classes export from `skpro.distributions` (parametric, SciPy-wrapped, empirical/QPD, composites).

---

## Methodology and invariants

**Invariants checked (where applicable):**

- \(F(x) \in [0,1]\); monotone `cdf` on grids  
- `ppf(cdf(x)) ≈ x` for continuous exact classes (scalar inputs)  
- `log_pdf` vs `log(pdf)`  
- `haz` vs `pdf/surv` when `surv > 0`  
- SciPy scalar reference for core families  
- Empirical vs reported moments for suspected composition bugs  

**Dedup:** GitHub search via `repo:sktime/skpro` on keywords and issue numbers cited in upstream discussions.

**Scripts:** `audits/skpro/reproductions/*.py` (runnable against editable install).

---

## Confirmed new bugs (not previously reported)

### SKPRO-BASE-001 — Tail `surv` and `haz` collapse (`1 - cdf`)

| Field | Detail |
|-------|--------|
| **Location** | `skpro/distributions/base/_base.py` — `_surv` (L1139–1145), `_haz` (L1181–1187) |
| **Root cause** | Default `_surv` implements \(S(x) = 1 - F(x)\). When \(F(x)\) rounds to `1.0` in float64 (e.g. `Normal.cdf(10)`), \(S(x)\) becomes **exactly 0** while the true tail is ~\(10^{-24}\). `_haz` then computes `pdf/surv` → `inf`/`nan`. |
| **Math** | For continuous tails, \(S(x) = 1 - F(x)\) is ill-conditioned when \(F(x) \to 1\); stable forms use `erfc` / `logcdf` / SciPy’s `sf` (survival function). |
| **Reproduction** | `reproductions/test_surv_tail_cancellation.py` |
| **Failing test (proposed)** | Assert `abs(surv(x) - scipy.stats.norm.sf(x)) / sf(x) < 1e-3` for `x` where `cdf(x) == 1.0`. |
| **Impact** | Survival analysis, hazard-based metrics, any downstream code using `surv`/`haz` in the right tail of light-tailed distributions. **High** for survival module; **medium** generally. |
| **Severity** | High (silent wrong tail; hazard undefined) |
| **Confidence** | High |
| **Fix** | Per-family `_surv` for exact continuous classes (e.g. Normal: `0.5 * erfc((x-μ)/(σ√2))`); or base helper using `scipy.special.ndtr`/`log_ndtr` pattern; mirror SciPy `sf` in adapter. |
| **PR size** | Small initial PR (Normal/Laplace + base helper); extend to other `erf`-based cdfs. |
| **GitHub duplicate** | **None found** (searched `surv`, `haz`, `erfc`, `tail`, `cancellation`). |

**Evidence (main @ 1462eee):**

```text
Normal(0,1).cdf(10)  → 1.0
Normal(0,1).surv(10) → 0.0
scipy.stats.norm.sf(10) → 7.62e-24
Normal(0,1).haz(10)  → inf (divide by zero)
```

---

### SKPRO-TRUNC-002 — Inverted truncation interval accepted

| Field | Detail |
|-------|--------|
| **Location** | `skpro/distributions/truncated.py` — `__init__`, `_get_low_high_prob`, `_calculate_density`, `_cdf` |
| **Root cause** | No validation that `lower <= upper` (with interval semantics). `normalizer = cdf(upper) - cdf(lower)` can be **negative**. |
| **Math** | Truncated density requires positive mass on \(I\); negative normalizer invalidates \(f_I(x) = f(x)/P(X \in I)\). |
| **Reproduction** | `reproductions/test_truncated_inverted_bounds.py` |
| **Failing test (proposed)** | `pytest.raises(ValueError)` for `TruncatedDistribution(Normal(0,1), lower=2, upper=1)`. |
| **Impact** | Any user-truncated model with swapped bounds gets silent nonsense `cdf`/`pdf`. |
| **Severity** | Medium |
| **Confidence** | High |
| **Fix** | Validate interval mass `> 0` at init; optional check `lower`/`upper` ordering. |
| **PR size** | Small |
| **GitHub duplicate** | **None found** |

**Evidence:**

```text
TruncatedDistribution(Normal(0,1), lower=2, upper=1)
  prob mass: upper-lower = -0.1359...
  cdf(1.5) ≈ 0.324, pdf(1.5) = 0.0
```

---

## Validated known bugs (reproduced on this commit)

These are **not** claimed as new findings; included with reproducers and impact for prioritization.

| ID | Summary | Location | Issue | Confidence |
|----|---------|----------|-------|------------|
| SKPRO-HURD-972 | `Hurdle._var` omits \(p(1-p)\mu^2\) term; tags `mean`/`var` exact while using approximate `LeftTruncated` | `hurdle.py` L180–184 | [#972](https://github.com/sktime/skpro/issues/972) | High |
| SKPRO-MIX-1191 | Scalar `Mixture._average` passes `weights=None` → uniform average | `mixture.py` L148–160 | [#1191](https://github.com/sktime/skpro/issues/1191) | High |
| SKPRO-MS-1185 | `MeanScale._mean` omits `sigma` multiplier | `meanscale.py` L119–127 | [#1185](https://github.com/sktime/skpro/issues/1185) | High |
| SKPRO-PARAM-959 | `Normal`/`Laplace` accept `sigma<=0`; invalid pdf (negative or nan) | `normal.py`, `laplace.py` | [#959](https://github.com/sktime/skpro/issues/959) | High |
| SKPRO-TRUNC-1247 | `TruncatedDistribution._ppf` subtracts `eps`; breaks `ppf(1)`, out-of-range `p` | `truncated.py` L172–185 | [#1247](https://github.com/sktime/skpro/issues/1247) | High |
| SKPRO-IDX-1201 | Scalar `iloc` on `Hurdle`/`ZeroInflated` | composite `_iloc` | [#1201](https://github.com/sktime/skpro/issues/1201) | High |
| SKPRO-IDX-1202 | `iloc`/`iat` with broadcast params length-1 | `base/_base.py` `_subset_param` | [#1202](https://github.com/sktime/skpro/issues/1202) | High |
| SKPRO-BC-673 | 0D distributions: `_coerce_to_self_index_np` cannot accept array grids | `base/_base.py` L1650–1676 | [#673](https://github.com/sktime/skpro/issues/673) | High |

**Hurdle variance evidence (scalar, `p=0.5`, `Normal(10,1)` base):** empirical sample variance ≈ **25.5** after 50k draws; `h.var()` ≈ **3.0** (consistent with missing squared-mean term in [#972](https://github.com/sktime/skpro/issues/972)).

**Mixture evidence:** `Mixture([N(-1), N(5)], weights=[0.75,0.25]).mean()` → **2.0** (unweighted); expected **0.5**. See `reproductions/test_mixture_scalar_weights.py`.

---

## Hypotheses investigated and rejected (not bugs)

| Hypothesis | Outcome |
|------------|---------|
| Laplace `_energy_self` wrong vs docstring \(3b/2\) | **Rejected** — implementation matches formula on tested instances (regression for [#720](https://github.com/sktime/skpro/issues/720) class). |
| Triangular scipy mapping mirrored | **Rejected** — covered by `test_triangular.py` mapping pins ([#954](https://github.com/sktime/skpro/issues/954) class). |
| pgmpy interoperability | **N/A** — no pgmpy integration in skpro; sklearn is the primary tabular ML bridge. |
| `TransformedDistribution` mean bug with mismatched index | **Inconclusive** on simple `x+10` affine case; see [#1186](https://github.com/sktime/skpro/issues/1186) for the reported scenario (not re-derived here to avoid unsupported claims). |

---

## Systemic gaps (ESoC-scale)

1. **Invariant testing** — [#1239](https://github.com/sktime/skpro/issues/1239) proposes sample-mean vs `mean()` across all classes; would have caught MeanScale, Mixture, Transformed bugs. Extend with tail `surv` vs SciPy `sf`, parameter rejection tests, and truncated-interval validation.
2. **Composite indexing** — duplicated `_iloc`/`_iat` in `Hurdle`, `ZeroInflated`, `TruncatedDistribution`, `TransformedDistribution` ([#907](https://github.com/sktime/skpro/issues/907), #1201, #1249).
3. **Capability tags vs reality** — composites advertise exact `mean`/`var` while delegating to approximate inner objects (Hurdle + LeftTruncated).
4. **Mixed measures** — `Hurdle`/`ZeroInflated` expose `pdf` values at atoms (`x=0`) that are not Lebesgue densities; document contract or split `pmf` vs continuous part for estimators integrating pdf.
5. **Default numerics in base** — `ppf` via bisection on generic `cdf`; `pdf` via numerical differentiation of `cdf` when only cdf exists; both are fragile for production tails.

---

## PR roadmap (classification)

### Small initial PRs (suitable for immediate contribution)

| PR | Change | Files |
|----|--------|-------|
| P1 | Stable `surv` for `Normal` (+ tests vs `scipy.stats.norm.sf`) | `normal.py`, tests |
| P2 | Base `_surv` guidance or `log_surv` helper; fix `_haz` when `surv==0` | `_base.py` |
| P3 | Reject inverted / empty truncation support | `truncated.py`, tests |
| P4 | Wire `Mixture._average(..., weights=self._weights)` for scalar branch | `mixture.py` (may overlap #1193) |

### Substantial statistical correctness (existing issues + tests)

- Hurdle variance + capability tags ([#972](https://github.com/sktime/skpro/issues/972))  
- MeanScale mean ([#1185](https://github.com/sktime/skpro/issues/1185))  
- Truncated `ppf` epsilon and out-of-support `p` ([#1247](https://github.com/sktime/skpro/issues/1247))  
- Positive scale validation ([#959](https://github.com/sktime/skpro/issues/959))  
- Mixture sampling independence ([#974](https://github.com/sktime/skpro/issues/974))  

### ESoC / mentored program themes

- Cross-distribution invariant harness (SciPy + sampling + tail stability)  
- Composite distribution mixin (indexing, capability propagation)  
- Survival/regression end-to-end CRPS and interval calibration tests  

---

## Regression and survival (brief)

- **Probabilistic regressors** inherit distribution objects from `predict_proba`; errors in `MeanScale`/`Mixture` propagate to conformal and bagging pipelines ([#1047](https://github.com/sktime/skpro/issues/1047) related).  
- **Survival** (`BaseSurvReg`) reuses regression with censoring column `C`; tail bugs in `surv`/`haz` are directly relevant to any survival distribution using base defaults. No additional standalone survival-algorithm bugs were confirmed beyond distribution-layer findings.

---

## Missing mathematical invariant tests (recommended)

| Invariant | Current coverage | Gap |
|-----------|------------------|-----|
| `mean` vs sample mean | None global | [#1239](https://github.com/sktime/skpro/issues/1239) |
| `surv` vs SciPy `sf` | None | **New** |
| Positive scale/rate params | Partial | [#959](https://github.com/sktime/skpro/issues/959) |
| Truncation interval valid | None | **New** |
| Weighted mixture consistency | None | [#1191](https://github.com/sktime/skpro/issues/1191) |
| Parametrization vs SciPy | Partial (triangular only) | Extend mapping tests per family |

---

## References

- Upstream: https://github.com/sktime/skpro  
- Audit reproducers: `audits/skpro/reproductions/`  
- Related prior audits in this repo: `audits/pgmpy/` (methodology template)

---

## Appendix: reproduction index

| Script | Demonstrates |
|--------|--------------|
| `test_surv_tail_cancellation.py` | SKPRO-BASE-001 |
| `test_truncated_inverted_bounds.py` | SKPRO-TRUNC-002 |
| `test_mixture_scalar_weights.py` | #1191 |
| `invariant_scan.py` | Broad scan (requires shape-aware `x` for arrays; useful for CI prototyping) |
| `scipy_compare.py` | Scalar SciPy parity (use scalar `x` for 0D dists) |