# GitHub duplicate analysis (sktime/sktime)

Searches run against public issues during audit (2026-03-27).

| Finding | Query / issue | Result |
|---------|---------------|--------|
| SKTIME-RED-001 (edge pad `X`) | `np.pad reduction exogenous`, `edge pad recursive` | **No match** |
| SKTIME-SPLIT-001 (empty train) | `ForecastingHorizonSplitter empty train` | **No match** |
| SKTIME-FH-001 (irregular datetime) | `irregular DatetimeIndex predict fh freq None` | [#4159](https://github.com/sktime/sktime/issues/4159) open (related; reducer/panel context) |
| Quantiles multivariate | `test_predict_quantiles_from_interval_multivariate` | Fixed in-tree via regression test |
| ForecastingHorizon periods | — | [#534](https://github.com/sktime/sktime/issues/534) closed |
| Global recursive reduction | `tests:skip_all` tag | [#7380](https://github.com/sktime/sktime/issues/7380) (tracked) |
| MAPA | `tests:skip_all` | [#8039](https://github.com/sktime/sktime/issues/8039) |
| scikit-learn panel freq | — | [#4159](https://github.com/sktime/sktime/issues/4159) |

**Recommendation:** File SKTIME-RED-001 and SKTIME-SPLIT-001 as new issues. SKTIME-FH-001 as comment or sub-case on #4159 if still open.