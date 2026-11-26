# LitmusChaos Rank 2 — experiment lifecycle findings

> Formal multi-pass deliverables: [`research/overview.md`](research/overview.md) (`findings.json`, dedup, mentorship).

# LitmusChaos Rank 2 — experiment lifecycle findings

Investigation of `litmuschaos/litmus` (ChaosCenter + subscriber) and execution
siblings `chaos-operator`, `chaos-runner`, `litmus-go` (cloned at HEAD of each
default branch, 2026-11-26). No production chaos was injected. Repros are
function-level Go tests under `repros/` plus source citations.

**No upstream PRs were opened** (task: no auto PRs). Fixes below are
recommended patches, not applied to Litmus.

## Repository map (Phase 0)

Critical path is Go. TypeScript owns ChaosCenter UI enums and filters; it does
not execute faults. Archived/UI-only: `chaoscenter/web` views, docs, mkdocs.
Runnable tests: see `workflow-invariants.md`.

LFX materials (`litmus/MENTORING.md`, CNCF 2023 Q2) point at ChaosCenter
workflow API redesign (`litmus#3970`) and operator/exporter upgrades
(`litmus#3969`) — not at the runner/probe bugs below.

## Classification

| ID | Class | Title | Confidence | Upstream issue |
| --- | --- | --- | --- | --- |
| L1 | B | `stopChaosEngine` swaps Delay/Timeout; timeout path skips engine stop | High | None found |
| L2 | B | OnChaos `initialDelay` subtracted as nanoseconds (k8s/prom/source cmd) | High | None found |
| L3 | B | Package-level `var err error` shared across probe goroutines | High | None found |
| L4 | B | Runner `GetChaosEngine` waits 2 **nanoseconds** | High | None found |
| L5 | B | `InitialPatchEngine` appends statuses; runner `OnFailure` restart duplicates rows | High | None found |
| L6 | B | Failed runner pod never moves engine off `initialized` | High | None found |
| L7 | B | Abort updates only the first `ChaosResult` for an engine UID | High | None found |
| L8 | C | Argo `Failed`/`Succeeded` both map to run phase `Completed`; probe-fail branch dead | High | Not this mapping |
| L9 | C | Stop run sets Mongo `completed: true` then drops subscriber executionData | High | Comment acknowledges disconnect case; connected case still drops |
| L10 | C | Stop/delete lists ChaosEngines only in `INFRA_NAMESPACE`, not admin-mode NS | High | Subscriber tests *document* sock-shop vs fallback NS |
| L11 | A | ExecutionData base64 fallback uses `ExperimentID` not `ExecutionData` | High | None found |
| L12 | A | GraphQL `ExperimentRunStatus` omits `Completed_With_Probe_Failure` (TS has it) | High | Enum drift, not filed |
| L13 | A | `GetExperimentRunStats` ignores `is_removed` | High | None found |
| L14 | B | Cmd/HTTP probe modes and Edge verdict are case-sensitive; `RunProbes` is not | Medium | None found |
| L15 | A | Resiliency weight match is `strings.Contains(engineName, faultName)` | Medium | Related closed: `litmus#3573` (score > 100%, different root cause) |

## L1 — `stopOnFailure` wait args reversed (B)

**Contract:** `checkForErrorInContinuousProbe(result, name, delay, timeout)` waits
up to `timeout` seconds, polling every `delay` seconds, then `stopChaosEngine`
patches `engineState=stop`.

**Actual:** `pkg/probe/probe.go` `stopChaosEngine` calls
`checkForErrorInContinuousProbe(..., chaosDetails.Timeout, chaosDetails.Delay)`.
Typical Delay=2–5, Timeout=180 → **5s budget, 180s sleep**. On
`FailureTypeProbeTimeout` the function **returns without** updating the engine.

**Repro:** Continuous/OnChaos probe, `stopOnFailure: true`, fail mid-chaos.
See `TestStopChaosEngineWaitArgsSwapped`.

**Fix:** Pass `(Delay, Timeout)`. On wait timeout still fail the probe **and**
patch stop.

## L2 — OnChaos duration after initialDelay (B)

**Contract:** OnChaos runs for `ChaosDuration` seconds minus `initialDelay`
seconds (inline cmd probe already uses `.Seconds()`).

**Actual:** `triggerSourceOnChaosCmdProbe`, `triggerOnChaosK8sProbe`,
`triggerOnChaosPromProbe` use `duration - int(probeTimeout.InitialDelay)`.
`int(time.Duration)` is nanoseconds. `initialDelay: 5s` with duration 60 →
`max(0, 60-5e9) = 0` → probe loop exits immediately.

**Repro:** `TestOnChaosRemainingDurationNanoseconds`.

## L3 — Shared package `err` (B)

**Contract:** Each probe instance records its own failure.

**Actual:** `var err error` in `pkg/probe/probe.go` assigned from continuous
goroutines and PostChaos on the main goroutine. Data race; wrong verdict
possible with two continuous probes.

**Fix:** Local `err` in each function (Go default). Run `go test -race`.

## L4 — 2ns engine Get retry (B)

**Contract:** Runner tests wait `2 * time.Second`. Production
`GetChaosEngine` uses `Wait(time.Duration(2))` (2ns) × 180.

**Impact:** Transient apiserver errors fail the runner almost immediately;
status stays Waiting/Skipped.

## L5 — Non-idempotent runner restart (B)

**Contract:** Reconcile after operator/runner restart must not duplicate
experiment rows.

**Actual:** Runner pod `restartPolicy: OnFailure`. `InitialPatchEngine`
**appends** `status.experiments` without clearing. `checkStatusListForExp`
returns the **first** match; extra rows stay `Waiting` forever.

**Repro:** `TestInitialPatchEngineDuplicatesOnRestart`.

## L6 — Failed runner does not complete/stop (B)

**Contract:** Terminal runner failure should complete or stop the engine, not
leave `initialized` + `active`.

**Actual:** `checkRunnerContainerCompletedStatus` only treats
`Terminated.Reason == "Completed"`. `PodFailed` / `Error` returns
`(false, nil)`. `reconcileForCreationAndRunning` then no-ops.

**Repro:** `TestFailedRunnerDoesNotCompleteEngine`.

## L7 — Abort patches one ChaosResult (B)

**Contract:** Abort should record stop across all experiments of the engine.

**Actual:** `updateChaosResult` lists every ChaosResult in the namespace, then
`return` after the first `chaosUID` match. Multi-experiment engines leave
stale Awaited results.

## L8 — Portal phase vs fault verdict (C)

**Contract:** UI `COMPLETED_WITH_PROBE_FAILURE`; failed Argo workflows are not
success.

**Actual:**

- `updateWorkflowStatus`: `WorkflowSucceeded` **and** `WorkflowFailed` →
  `"Completed"`.
- `getExperimentStatus` only counts node **phase**
  `Completed_With_Probe_Failure` / `Error`.
- `getChaosData` sets node phase from ChaosResult **Phase** (`Completed`) while
  failure lives in `ExperimentVerdict`. Nothing writes
  `Completed_With_Probe_Failure` onto nodes.

Result: Argo Succeeded + verdict Fail → Mongo phase `Completed`, while
`ProcessCompletedExperimentRun` increments `faults_failed`.

**Repro:** `TestWorkflowPhaseMapping` , `TestGetExperimentStatusIgnoresVerdict`.

Searched `litmuschaos/litmus` issues: `Completed_With_Probe_Failure` hits are
unrelated probe YAML / HTTP error-vs-fail (`#3532`, `#5351`, `#3573`).

## L9 — Stop vs subscriber (C)

`ProcessExperimentRunStop` sets `phase=Stopped`, `completed=true` so disconnected
agents do not stick at Running. `UpdateExperimentRun` matches `completed: false`
only. When the agent **is** connected, later `chaosExperimentRun` events (final
verdicts, cleanup) match 0 documents and are discarded as “duplicate”.

API Stopped + stale `execution_data` vs cluster still reverting.

## L10 — Stop engines in wrong namespace (C)

`resolveEngineNamespace` (with tests) applies engines in
`adminModeNamespace` (e.g. `sock-shop`). `WorkflowRequest` stop/delete calls
`StopChaosEngineState(INFRA_NAMESPACE|AGENT_NAMESPACE)`. Those engines keep
injecting after the API shows Stopped (compounds L9).

## L11 — ExecutionData fallback typo (A)

Comment: support legacy non-base64 `executionData`.
Code: `exeData = []byte(event.ExperimentID)`. Unmarshal fails or yields empty
metrics for old subscribers.

**Repro:** `TestExecutionDataFallbackUsesWrongField`.

## L12 — Enum drift (A)

TS `ExperimentRunStatus.COMPLETED_WITH_PROBE_FAILURE = 'Completed_With_Probe_Failure'`.
GraphQL generated enum: All, Running, Completed, Completed_With_Error, Stopped,
Skipped, Error, Timeout, Terminated, Queued, NA — **no probe-failure value**.

## L13 — Stats include removed runs (A)

`GetExperimentRunStats` `$match` is only `project_id`. `ListExperimentRun`
filters `is_removed: false`. Deleted runs inflate totals.

## L14 — Probe mode case (B, medium)

`RunProbes` uses `strings.ToLower(probe.Mode)`. Cmd/HTTP `preChaos*` switches on
`"SOT", "Edge"`. `setProbeVerdict` Edge guard is `probes.Mode == "Edge"`.
Manifest `mode: continuous` / `edge` → cmd/http probes never start; Edge PreChaos
can publish Pass immediately.

## L15 — Weight matching (A, medium)

`strings.Contains(engineName, expName)` over a map. Faults `nginx` and
`nginx-delay` can steal each other’s weights (iteration order). Overlapping
names only; still a contract bug for resiliency score.

## Operator notes (not filed as separate IDs)

- `getChaosStatus` indexes `strings.Split(k, "/")[1]` with no length check —
  abort panics on annotation keys without `/`.
- Runner security context is taken from `Experiments[0]` only.
- Creating a ChaosEngine with `engineState: stop` and empty status matches no
  reconcile branch (abort requires `initialized`).
- Cleanup on abort does not delete experiment ConfigMaps/Secrets (only Jobs/Pods).

## False positives excluded

- Target app crash from a fault.
- `SetProbeVerdictAfterFailure` mapping Awaited → N/A after experiment error
  (documented).
- `jobCleanUpPolicy: retain` leaving pods (documented).
- HTTP connection errors treated as probe ERROR (`litmus#5351`, closed/feature).

## Suggested fix order

1. L1+L2+L3 in `litmus-go` (probe correctness).
2. L4+L5+L6+L7 in runner/operator (lifecycle).
3. L8+L9+L10+L11 in ChaosCenter/subscriber (portal vs cluster).
4. L12+L13+L14+L15 as follow-ups.
