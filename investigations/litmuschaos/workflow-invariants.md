# Litmus workflow and experiment invariants

Source of truth: Litmus docs (Chaos Execution Plane), CRD comments in
`litmuschaos/chaos-operator`, ChaosCenter GraphQL schema + frontend enums, and
in-tree comments. These are **platform contracts**, not application-under-test
health. Chaos that makes a target pod die is not a Litmus bug; a workflow marked
`Completed` while a fault verdict is `Fail` is.

## Control vs execution

| Layer | Repo / path | Language | Role |
| --- | --- | --- | --- |
| ChaosCenter UI | `litmuschaos/litmus` `chaoscenter/web` | TypeScript | Studio, run history, probe UX |
| GraphQL + auth | `litmus/chaoscenter/graphql`, `authentication` | Go | Experiment CRUD, run events, stats |
| Subscriber | `litmus/chaoscenter/subscriber` | Go | Apply Argo workflows, watch engines, mutate runs |
| Chaos operator | `litmuschaos/chaos-operator` | Go | Reconcile `ChaosEngine` → runner pod, abort/complete/restart |
| Chaos runner | `litmuschaos/chaos-runner` | Go | Sequential experiment jobs, engine status patches, job GC |
| Fault jobs | `litmuschaos/litmus-go` | Go | Fault logic, probes, `ChaosResult` verdicts |
| Metrics | `litmuschaos/chaos-exporter` | Go | Prometheus from `ChaosResult` |

Workflow DAG execution is **Argo Workflows** (in-cluster), not an embedded
engine. ChaosCenter stores a Mongo projection of subscriber events; it is not
the source of truth for in-cluster CRs.

## CRDs

- **ChaosExperiment**: installable fault template (image, env defaults, RBAC).
- **ChaosEngine**: binds AUT/selectors to one or more experiments + probes.
  `spec.engineState` is `active` \| `stop`. `status.engineStatus` is
  `initialized` \| `completed` \| `stopped`.
- **ChaosResult**: per `(engine, experiment[, instanceID])` verdict, probe
  statuses, history/targets.
- **Argo Workflow / CronWorkflow**: ChaosCenter “experiment” (formerly
  workflow/scenario). Steps create ChaosExperiment + ChaosEngine CRs.

## Documented lifecycle

```
Control plane (GraphQL)
  → subscriber applies Argo Workflow
  → Argo creates ChaosExperiment + ChaosEngine
  → operator: EngineStatus initialized, runner pod
  → runner: patch experiment Waiting, launch Job, watch, patch Completed + verdict
  → litmus-go: PreChaos probes → inject → DuringChaos/OnChaos → PostChaos → ChaosResult
  → operator: runner Completed → EngineStatus completed, EngineState stop, optional job GC
  → subscriber: chaosExperimentRun mutation (executionData, phase, completed)
```

Abort: `engineState=stop` while `engineStatus=initialized` → force-delete pods/jobs
labeled `chaosUID`, patch results, `engineStatus=stopped`.

Restart after abort/complete: `engineState=active` with `stopped`/`completed` →
wipe experiment statuses, re-initialize.

## Probe modes (litmus-go)

Modes are SOT, EOT, Edge, Continuous, OnChaos. Docs and `RunProbes` treat them
**case-insensitively**. Edge must pass **both** PreChaos and PostChaos; a PreChaos
fail must not be overwritten by PostChaos pass. Continuous/OnChaos run in
goroutines for the chaos window (`TOTAL_CHAOS_DURATION` **seconds** minus
`initialDelay` **seconds**). `stopOnFailure: true` must patch `engineState=stop`.

## Verdicts and terminal states

ChaosResult verdicts: `Pass` \| `Fail` \| `Stopped` \| `Awaited` \| `N/A`.
Engine experiment status: Running, Completed, Waiting for Job Creation,
ChaosExperiment Not Found, Forcefully Aborted, Skipped.

ChaosCenter frontend (`ExperimentRunStatus`) includes
`Completed_With_Probe_Failure`. GraphQL enum currently does **not**. A finished
Argo workflow with failed faults must not be presented as an unqualified
success (`Completed` with no failure class).

## Status monotonicity

- In-cluster: `initialized` → `completed` \| `stopped`. Restart is an explicit
  `engineState=active` after a terminal status.
- Mongo experiment runs: updates apply only while `completed: false`. Once
  `completed: true`, later subscriber events must not be silently discarded
  **unless** the run was actually terminal in-cluster. Stop must still allow
  executionData to catch up, or stop must not complete the row before the
  cluster has unwound.

## Cleanup

- `jobCleanUpPolicy: delete` — runner deletes the experiment Job; operator
  deletes runner/experiment pods on complete.
- `retain` — jobs/pods remain; finalizer stays until restart/delete.
- Abort deletes Jobs and Pods matching `chaosUID` in the engine namespace.
- ConfigMaps/Secrets listed on the engine are not owned by the operator; they
  must not be treated as cleaned unless documented as such.

## Retry, timeout, cancellation

- Operator/runner Get retries: documented as ~180 attempts with **seconds** of
  backoff (runner tests use `time.Duration(2) * time.Second`).
- Probe `probeTimeout` / `interval` / `initialDelay` are duration strings.
- Stop is cooperative: patch engine + Argo `shutdown: Stop`. Engines created
  under `adminModeNamespace` must be listed in **that** namespace, not only
  `INFRA_NAMESPACE`.

## Semantics

- Runner experiments are **sequential** (for-loop in `chaos-runner` `main`).
  Parallelism is Argo-level (multiple ChaosEngines), not in-engine.
- Job launch is **at-least-once** if the runner pod restarts (`restartPolicy:
  OnFailure`) after creating a Job; reconcile must be idempotent (no duplicate
  `status.experiments` rows).
- Portal stats (`GetExperimentRunStats`) must exclude `is_removed: true`,
  matching `ListExperimentRun`.

## Tests in tree

| Component | Tests |
| --- | --- |
| chaos-operator | `controllers/chaosengine_controller_test.go` (fake client), BDD under `tests/` |
| chaos-runner | `pkg/utils/*_test.go`, `tests/runner_test.go` |
| litmus-go | sparse probe unit tests; retry helper tests |
| ChaosCenter GraphQL | `handler_test.go`, fuzz tests, probe handler tests |
| subscriber | `util_test.go` (namespace resolution), k8s operation tests |

There is no envtest covering stop-vs-runner-complete races or probe-mode
case-folding end to end.
