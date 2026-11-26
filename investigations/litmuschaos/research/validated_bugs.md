# Validated bugs

Confirmed on clones at commits listed in `architecture.md`. Regression tests in
`../repros/` unless noted.

## LITMUS-001 — stopChaosEngine delay/timeout swap (B, high)

- **Files:** `litmus-go` `pkg/probe/probe.go:312`
- **Test:** `TestStopChaosEngineWaitArgsSwapped` — PASS (documents 5s/180s inversion)

## LITMUS-002 — OnChaos initialDelay nanoseconds (B, high)

- **Files:** `pkg/probe/k8sprobe.go:413`, `pkg/probe/cmdprobe.go:456`
- **Test:** `TestOnChaosRemainingDurationNanoseconds`

## LITMUS-004 — Runner 2ns wait (A, high)

- **Files:** `chaos-runner` `pkg/utils/watchJob.go:35`
- **Test:** `TestRunnerGetChaosEngineWaitIsNanoseconds`

## LITMUS-005 — Duplicate experiment statuses (B, high)

- **Files:** `chaos-runner` `pkg/utils/initialPatchEngine.go:27`
- **Test:** `TestInitialPatchEngineDuplicatesOnRestart`

## LITMUS-006 — Failed runner stuck (B, high)

- **Files:** `chaos-operator` `chaosengine_controller.go:415-435`
- **Test:** `TestFailedRunnerDoesNotCompleteEngine`

## LITMUS-007 — Single ChaosResult on abort (B, high)

- **Files:** `chaos-operator` `chaosengine_controller.go:765-776`
- **Test:** `TestAbortUpdatesOnlyFirstChaosResult`

## LITMUS-008 — Workflow phase vs verdict (C, high)

- **Files:** `subscriber/pkg/events/workflow.go:276-336`, `util.go:58-76`
- **Tests:** `TestWorkflowPhaseMapping`, `TestGetExperimentStatusIgnoresVerdict`

## LITMUS-009 — Stop vs Mongo completed (C, high)

- **Files:** `chaos_experiment_run/service.go:82-83`, `operations.go:108`
- **Evidence:** Intentional disconnect comment; connected path still blocks updates

## LITMUS-010 — Stop wrong namespace (B, high)

- **Files:** `subscriber/pkg/utils/workflow.go:46`, `events/util.go:111-117`
- **Test:** `TestStopListsInfraNamespaceNotEngineNamespace`

## LITMUS-011 — ExecutionData fallback (A, high)

- **Files:** `handler/handler.go:1145`
- **Test:** `TestExecutionDataFallbackUsesWrongField`

## LITMUS-012 — GraphQL enum drift (A, high)

- **Test:** `TestGraphQLEnumMissingProbeFailure`

## LITMUS-013 — Stats include removed (A, high)

- **Test:** `TestStatsCountRemovedRuns`

## LITMUS-014 — Probe mode case (B, medium)

- **Test:** `TestCmdProbeModeCaseSensitive`

## LITMUS-015 — Weight substring (A, medium)

- **Test:** `TestResiliencyWeightContainsOverlap`

## LITMUS-019 — Cron timezone omitted (A, high)

- **Evidence:** `processCronExperimentManifest` line 640 sets only `Schedule`

## LITMUS-022 — ListExperimentRun empty/panic (A, high)

- **Files:** `handler/handler.go:568-572`
- **Test:** `TestListExperimentRunEmptyResultHandling`

## LITMUS-003 — Global probe err (B, high)

- **Evidence:** package `var err error`; recommend `-race` in litmus-go CI

**Test run (2026-11-26):** 16 tests in `repros/`, all PASS encoding present upstream bugs.