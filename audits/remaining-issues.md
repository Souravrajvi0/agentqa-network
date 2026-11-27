# GitHub filing tracker

Status for validated audit bugs. Issues are opened with `gh` as @Souravrajvi0 (not Cursor forms).

**Full matrix:** [github-status-matrix.md](./github-status-matrix.md)

---

## All validated bugs

| ID | Repo | GitHub | Fix PR |
|----|------|--------|--------|
| SKTIME-RED-001 | sktime/sktime | [#11973](https://github.com/sktime/sktime/issues/11973) | [#11974](https://github.com/sktime/sktime/pull/11974) |
| SKTIME-SPLIT-001 | sktime/sktime | [#11975](https://github.com/sktime/sktime/issues/11975) | — |
| SKTIME-FH-001 | sktime/sktime | (optional) [#4159](https://github.com/sktime/sktime/issues/4159) | — |
| ANTREA-IPAM-001 | antrea-io/antrea | [#8670](https://github.com/antrea-io/antrea/issues/8670) | [#8671](https://github.com/antrea-io/antrea/pull/8671) |
| ANTREA-IPAM-002 | antrea-io/antrea | [#8672](https://github.com/antrea-io/antrea/issues/8672) | — |
| SKPRO-BASE-001 | sktime/skpro | [#1256](https://github.com/sktime/skpro/issues/1256) | — |
| SKPRO-TRUNC-002 | sktime/skpro | [#1257](https://github.com/sktime/skpro/issues/1257) | — |
| PGMPY-LGBN-001…002, CPD, ID | pgmpy/pgmpy | [#2714](https://github.com/pgmpy/pgmpy/issues/2714), [#3746](https://github.com/pgmpy/pgmpy/issues/3746), [#3744](https://github.com/pgmpy/pgmpy/issues/3744), [#3553](https://github.com/pgmpy/pgmpy/issues/3553) | — |
| PGMPY-LGBN-003 | pgmpy/pgmpy | [#3753](https://github.com/pgmpy/pgmpy/issues/3753) | — |
| PGMPY-FD-001 | pgmpy/pgmpy | [#3754](https://github.com/pgmpy/pgmpy/issues/3754) | — |
| PGMPY-FBN-001 | pgmpy/pgmpy | **Not filed** (needs torch/pyro repro) | — |

**Already upstream (skpro cluster):** [#972](https://github.com/sktime/skpro/issues/972), [#1191](https://github.com/sktime/skpro/issues/1191), [#1185](https://github.com/sktime/skpro/issues/1185), [#959](https://github.com/sktime/skpro/issues/959), [#1247](https://github.com/sktime/skpro/issues/1247), [#1201](https://github.com/sktime/skpro/issues/1201), [#1202](https://github.com/sktime/skpro/issues/1202), [#673](https://github.com/sktime/skpro/issues/673), [#1239](https://github.com/sktime/skpro/issues/1239) (ESoC harness).

---

## Optional next steps

1. **SKTIME-FH-001** — Add comment or minimal repro link on [#4159](https://github.com/sktime/sktime/issues/4159).
2. **PGMPY-FBN-001** — Run `reproductions/test_functional_copy_contract.py` in torch env; file if still broken.
3. **ESoC meta** — See matrix: sktime leakage ([#8063](https://github.com/sktime/sktime/issues/8063)), antrea unified IPAM (no issue yet).

---

## Reference: SPLIT-001 body (filed as #11975)

Repro: `audits/sktime/reproductions/test_fh_splitter_empty_train.py`

`len(y)=10`, `fh=10` → `train=[]`, `test=[0..9]` via `temporal_train_test_split` / `ForecastingHorizonSplitter`.

---

## Reference: IPAM-002 body (filed as #8672)

Repro: `audits/antrea-io/reproductions/secondary-ipam-same-family/`

Secondary path missing same-family `continue` after successful IPv4/IPv6 alloc (primary `Add` has it).