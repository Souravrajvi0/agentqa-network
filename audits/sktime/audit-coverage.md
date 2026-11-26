# Audit coverage (sktime)

| Area | Files reviewed | Depth | Validated new issues |
|------|----------------|-------|----------------------|
| ForecastingHorizon | `_fh.py`, `check_fh` | Deep | SKTIME-FH-001, SKTIME-SPLIT-001 (coercion) |
| Reduction | `_reduce.py` numpy recursive path | Deep | SKTIME-RED-001 |
| Split / CV | `split/fh.py`, `temporal_train_test_split.py` | Medium | SKTIME-SPLIT-001 |
| Base forecaster | `_base.py` (sampled), `test_base_bugs.py` | Medium | — (prior fixes) |
| Probabilistic mixin | `_mixin.py` | Medium | — |
| Pipelines | `_pipeline.py` predict_proba / `_transform` | Light | — |
| Metrics | `_mase.py`, `_coerce.py` | Light | — |
| Adapters | pmdarima/statsforecast snippets | Light | — (deps not installed) |
| Reconcile | `reconcile.py` | Light | candidate only |
| Datatypes | `_check.py` entry | Light | — |
| CI-skipped forecasters | tags grep | Inventory | tracked upstream issues |

**Not audited exhaustively:** foundation models (Chronos, Moirai, …), deep learning trainers, full metrics module matrix, every adapter package.