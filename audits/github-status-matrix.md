# GitHub status matrix (audit → upstream)

**Last updated:** 2026-11-27 (extended pass: repo issue search + `cursor-github` queries + filing via `gh` as @Souravrajvi0).

**Method limits:** Keyword/issue search only—not a full-text scan of every closed issue. **Confidence:** **high** = 0 on-point hits after multiple queries; **medium** = related upstream issue exists; **low** = large result set not manually reviewed.

**Quick links:** [Remaining draft bodies](./remaining-issues.md) · Per-repo dedup: [sktime](./sktime/github-dedup.md) · [skpro](./skpro/github-dedup.md) · [pgmpy](./pgmpy/github-dedup.md) · [antrea](./antrea-io/github-dedup.md)

---

## Summary

| Action | Count |
|--------|------:|
| Filed by you (with fix PR where noted) | 6 |
| Filed this run (bugs only) | 6 |
| Still optional / enhancement-only | see ESoC table |

---

## Confirmed bugs — filing status

| Audit ID | Repo | Severity | GitHub | Fix PR | Dedup confidence |
|----------|------|----------|--------|--------|------------------|
| SKTIME-RED-001 | sktime | High | [#11973](https://github.com/sktime/sktime/issues/11973) | [#11974](https://github.com/sktime/sktime/pull/11974) | High (new) |
| SKTIME-SPLIT-001 | sktime | High | [#11975](https://github.com/sktime/sktime/issues/11975) | — | High (queries: `empty train ForecastingHorizonSplitter`, `temporal_train_test_split fh` → 0) |
| SKTIME-FH-001 | sktime | Med | Comment on [#4159](https://github.com/sktime/sktime/issues/4159) (optional) | — | Medium (partial overlap) |
| ANTREA-IPAM-001 | antrea | High | [#8670](https://github.com/antrea-io/antrea/issues/8670) | [#8671](https://github.com/antrea-io/antrea/pull/8671) | High (new vs #7868) |
| ANTREA-IPAM-002 | antrea | High | [#8672](https://github.com/antrea-io/antrea/issues/8672) | — | High (`SecondaryNetworkAllocate` → 0) |
| SKPRO-BASE-001 | skpro | High | [#1256](https://github.com/sktime/skpro/issues/1256) | — | High (`surv haz erfc`, code search → 0) |
| SKPRO-TRUNC-002 | skpro | Med | [#1257](https://github.com/sktime/skpro/issues/1257) | — | High (≠ [#1247](https://github.com/sktime/skpro/issues/1247)) |
| PGMPY-LGBN-001 | pgmpy | High | [#2714](https://github.com/pgmpy/pgmpy/issues/2714) | — | High (known) |
| PGMPY-LGBN-002 | pgmpy | High | [#3746](https://github.com/pgmpy/pgmpy/issues/3746) | — | High (known) |
| PGMPY-CPD-001 | pgmpy | High | [#3744](https://github.com/pgmpy/pgmpy/issues/3744) | — | High (known) |
| PGMPY-ID-001 | pgmpy | High | [#3553](https://github.com/pgmpy/pgmpy/issues/3553) | — | High (known) |
| PGMPY-LGBN-003 | pgmpy | Med | [#3753](https://github.com/pgmpy/pgmpy/issues/3753) | — | High (`check_model beta LinearGaussian` → 0) |
| PGMPY-FD-001 | pgmpy | Med | [#3754](https://github.com/pgmpy/pgmpy/issues/3754) | — | High (≠ #2688 doc fix) |
| PGMPY-FBN-001 | pgmpy | Med | **Not filed** (torch/pyro path not executed in audit env) | — | Low |

---

## Known upstream (do not re-file)

| Theme | Issue(s) |
|-------|----------|
| skpro Hurdle variance | [#972](https://github.com/sktime/skpro/issues/972) |
| skpro Mixture weights | [#1191](https://github.com/sktime/skpro/issues/1191) |
| skpro MeanScale mean | [#1185](https://github.com/sktime/skpro/issues/1185) |
| skpro σ ≤ 0 | [#959](https://github.com/sktime/skpro/issues/959) |
| skpro Truncated ppf ε | [#1247](https://github.com/sktime/skpro/issues/1247) |
| skpro composite iloc | [#1201](https://github.com/sktime/skpro/issues/1201), [#1202](https://github.com/sktime/skpro/issues/1202) |
| skpro 0D vectorization | [#673](https://github.com/sktime/skpro/issues/673) |
| skpro invariant harness (ESoC) | [#1239](https://github.com/sktime/skpro/issues/1239) |
| sktime splitter (other bug) | [#10580](https://github.com/sktime/sktime/issues/10580) closed |
| sktime `tests:skip_all` | [#7380](https://github.com/sktime/sktime/issues/7380), [#8039](https://github.com/sktime/sktime/issues/8039), … |
| antrea ExternalIPPool gateway | [#7868](https://github.com/antrea-io/antrea/issues/7868), PR #8531 |
| antrea LFX mentorship | [#7701](https://github.com/antrea-io/antrea/issues/7701) |

---

## ESoC / architecture themes (not duplicated as umbrella issues)

| Audit theme | Suggested action | Related upstream | Confidence no umbrella |
|-------------|------------------|------------------|------------------------|
| `evaluate` + `cv_global` temporal leakage | ENH: warn / safe defaults | [#8063](https://github.com/sktime/sktime/issues/8063) (partial—non-SingleWindowSplitter + pre-instance temporal split) | Medium |
| Temporal benchmarking harness | Meta issue or GSoC pitch | #8063, [#6997](https://github.com/sktime/sktime/issues/6997) global pipelines | Medium |
| FhPlex metric isolation | Repro then file | [#7929](https://github.com/sktime/sktime/issues/7929) (related test failures) | Medium |
| Reconciler residuals | Needs repro before file | — | High |
| skpro SciPy/tail invariant program | Extend #1239 | [#1239](https://github.com/sktime/skpro/issues/1239) | Low (epic exists) |
| Unified antrea primary/secondary IPAM contract | Meta issue | — | High |
| PacketCapture / observability mentorship | Do not file dup | [#7701](https://github.com/antrea-io/antrea/issues/7701) | High |

---

## Search log (2026-11-27 extended pass)

Representative queries re-run for this matrix:

```
repo:sktime/sktime ForecastingHorizonSplitter empty train          → 0
repo:sktime/sktime cv_global temporal leakage evaluate             → 0 (direct); #8063 via "global cross validate temporal"
repo:antrea-io/antrea SecondaryNetworkAllocate IPAM                  → 0
repo:sktime/skpro surv haz tail erfc                               → 0 (prior audit)
repo:sktime/skpro inverted truncation lower upper                    → 0
repo:pgmpy/pgmpy check_model beta LinearGaussian                     → 0
repo:pgmpy/pgmpy frontdoor exposures                               → no on-point (doc #2688 closed)
```

---

## Maintainer suggestions (from prior PR work)

| PR | Suggested reviewers |
|----|---------------------|
| sktime [#11974](https://github.com/sktime/sktime/pull/11974) | @fkiraly, @benheid, @Lovkush-A |
| antrea [#8671](https://github.com/antrea-io/antrea/pull/8671) | @antoninbas, @wenqiq |

---

## Repro paths (this repo)

| Audit ID | Script / test |
|----------|----------------|
| SKTIME-RED-001 | `audits/sktime/reproductions/test_recursive_short_X_edge_pad.py` |
| SKTIME-SPLIT-001 | `audits/sktime/reproductions/test_fh_splitter_empty_train.py` |
| SKTIME-FH-001 | `audits/sktime/reproductions/test_irregular_datetime_fh.py` |
| ANTREA-IPAM-001 | `audits/antrea-io/reproductions/ippool-gateway-in-range/` |
| ANTREA-IPAM-002 | `audits/antrea-io/reproductions/secondary-ipam-same-family/` |
| SKPRO-BASE-001 | `audits/skpro/reproductions/test_surv_tail_cancellation.py` |
| SKPRO-TRUNC-002 | `audits/skpro/reproductions/test_truncated_inverted_bounds.py` |
| pgmpy | `audits/pgmpy/reproductions/test_lgbn_beta_length.py`, etc. |