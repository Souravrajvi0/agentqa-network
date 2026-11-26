# GitHub deduplication log

Searches run against public GitHub (2026-11-26). “None” = no direct match on symptom + component.

## Search matrix

| Finding ID | Query | Result |
| --- | --- | --- |
| LITMUS-001 | `repo:litmuschaos/litmus-go stopChaosEngine checkForErrorInContinuousProbe` | None |
| LITMUS-002 | `repo:litmuschaos/litmus-go initialDelay OnChaos probe` | None |
| LITMUS-003 | `repo:litmuschaos/litmus-go probe var err race` | None |
| LITMUS-004 | `repo:litmuschaos/chaos-runner Wait Duration GetChaosEngine` | None |
| LITMUS-005 | `repo:litmuschaos/chaos-runner InitialPatchEngine append` | None |
| LITMUS-006 | `repo:litmuschaos/chaos-operator runner Failed completed` | None |
| LITMUS-007 | `repo:litmuschaos/chaos-operator updateChaosResult first match` | None |
| LITMUS-008 | `repo:litmuschaos/litmus WorkflowFailed Completed probe failure` | None (semantic: unrelated probe init #3532, HTTP #5351) |
| LITMUS-009 | `repo:litmuschaos/litmus ProcessExperimentRunStop completed subscriber` | None |
| LITMUS-010 | `repo:litmuschaos/litmus adminModeNamespace StopChaosEngineState` | None (code has tests for *resolve* only) |
| LITMUS-011 | `repo:litmuschaos/litmus execution data ExperimentID base64` | None |
| LITMUS-012 | `repo:litmuschaos/litmus Completed_With_Probe_Failure GraphQL enum` | None |
| LITMUS-013 | `repo:litmuschaos/litmus GetExperimentRunStats is_removed` | None |
| LITMUS-019 | `repo:litmuschaos/litmus cron timezone CronSyntax` | None |
| LITMUS-022 | `repo:litmuschaos/litmus ListExperimentRun decoding cursor` | None |

## Related but not duplicate

| Issue | Relation |
| --- | --- |
| [litmus#3970](https://github.com/litmuschaos/litmus/issues/3970) | LFX redesign chaos workflow APIs — meta, not these bugs |
| [litmus#3573](https://github.com/litmuschaos/litmus/issues/3573) | Resiliency score > 100% (closed); different mechanism than LITMUS-015 |
| [litmus#5351](https://github.com/litmuschaos/litmus/issues/5351) | HTTP probe errors vs failures (closed) |
| [litmus#4251](https://github.com/litmuschaos/litmus/issues/4251) | UI stopOnFailure toggle (closed), not runtime LITMUS-001 |

## PR scan

No merged PRs found matching `stopChaosEngine` argument order or `executionData` `ExperimentID` fallback on default branch (code search via local clone @ 97a397fb).

## Status labels

All listed validated IDs: **previously unreported candidate** unless noted above.