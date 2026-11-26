# Test coverage map (behavioral gaps)

Pass 1–8 coverage notes for `litmuschaos/litmus` @ `97a397fb` and execution siblings.
“Covered” means meaningful assertions on the behavior in question, not merely compile.

## GraphQL backend (`chaoscenter/graphql/server`)

| Package / area | Unit / fuzz tests | Gap |
| --- | --- | --- |
| `chaos_experiment_run/handler` | `handler_test.go` (partial) | `ChaosExperimentRunEvent` stop vs `completed`, executionData fallback, RunSequence, Fatalf path |
| `chaos_experiment_run/service` | mocks only | `ProcessExperimentRunStop` vs subscriber replay |
| `chaos_experiment/handler` | `handler_test.go` | Cron timezone persistence, multi-revision probes |
| `chaos_experiment/ops` | limited | `processCronExperimentManifest` schedule-only |
| `ListExperimentRun` aggregation | none for empty facet | Empty match → panic risk (LITMUS-022) |
| `GetExperimentRunStats` | none | `is_removed` filter missing |
| `probe/handler` | `handler_test.go` | — |
| `chaos_infrastructure` | `infra_utils_test.go`, fuzz | stop + admin namespace E2E |
| `authorization` | jwt tests, fuzz | — |

## Subscriber (`chaoscenter/subscriber`)

| Area | Tests | Gap |
| --- | --- | --- |
| `events/util.go` | `resolveEngineNamespace`, `getAdminModeNamespace` | Stop uses wrong NS (not tested) |
| `events/workflow.go` | none | `updateWorkflowStatus`, `getExperimentStatus` vs verdict |
| `events/chaosengine.go` | mocks | `StopChaosEngineState` label selector |

## Frontend (`chaoscenter/web`)

| Area | Tests | Gap |
| --- | --- | --- |
| Views | scattered `*.test.tsx` | `phaseToUI` collapses probe-failure to Completed |
| API entities | enums include probe-failure | GraphQL schema enum mismatch |

## Execution plane (sibling repos)

| Repo | Tests | Gap |
| --- | --- | --- |
| chaos-operator | `chaosengine_controller_test.go`, BDD | Failed runner completion; `getChaosStatus` panic keys |
| chaos-runner | utils tests, `runner_test.go` | InitialPatchEngine idempotency; 2ns wait |
| litmus-go | sparse probe tests | stopChaosEngine args, OnChaos duration, package `err` race |

## Cross-component paths lacking integration tests

1. Frontend list runs → GraphQL aggregate → empty project (LITMUS-022)
2. Stop run → Mongo completed → subscriber terminal event (LITMUS-009)
3. Admin-mode workflow → engine in app NS → stop in infra NS (LITMUS-010)
4. Argo Failed → subscriber phase → dashboard stats (LITMUS-008)
5. Continuous probe stopOnFailure → engine stop (LITMUS-001, litmus-go)

## Pass completion

| Pass | Status |
| --- | --- |
| 1 Architecture | Done → `architecture.md` |
| 2 GraphQL / business logic | Done → findings LITMUS-009–022 |
| 3 Persistence | Done → LITMUS-009, 013, 017, 022 |
| 4 Lifecycle / scheduling | Done → LITMUS-008, 019, execution LITMUS-001–007 |
| 5 Events / concurrency | Done → LITMUS-003, 010, 018 |
| 6 Frontend | Done → LITMUS-012, 023 (candidate UI collapse) |
| 7 Regression + dedup | Done → `repros/`, `github_dedup.md` |
| 8 Skeptical review | Done → `rejected_findings.md` |