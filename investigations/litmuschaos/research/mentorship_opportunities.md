# LFX / mentorship-scale opportunities

Aligned with historical Litmus mentorship ([litmus#3970](https://github.com/litmuschaos/litmus/issues/3970),
[litmus#3969](https://github.com/litmuschaos/litmus/issues/3969)) but scoped to **reliability**
found in this investigation. These are too large for a single drive-by PR.

## 1. Chaos experiment run state machine (ChaosCenter)

**Problem cluster:** LITMUS-008, LITMUS-009, LITMUS-012, LITMUS-017, LITMUS-022

Mongo run documents are a **projection** of subscriber events, but stop/disconnect semantics,
phase enums, and aggregation handlers disagree on terminal state and empty results.

**Engineering work:**

- Define explicit run FSM (Queued → Running → {Completed, Completed_With_Probe_Failure, Error, Stopped, Terminated}).
- Refactor `ChaosExperimentRunEvent` and `ProcessExperimentRunStop` for idempotent terminal merges.
- Unify subscriber phase mapping with `ExperimentVerdict` / ChaosResult phase.
- GraphQL schema + TS client regeneration.
- Table-driven integration tests (Mongo testcontainer or existing mocks).

**Why mentorship-scale:** Touches subscriber, GraphQL handlers, schema, frontend enums, and
requires integration tests—not a one-file fix.

## 2. Probe subsystem hardening (litmus-go + portal)

**Problem cluster:** LITMUS-001, LITMUS-002, LITMUS-003, LITMUS-014, LITMUS-019 (indirect)

Probes span CRD validation, runner env, litmus-go execution, and ChaosCenter probe APIs.

**Engineering work:**

- Eliminate global state; race detector in CI.
- Normalize probe mode casing at API boundary (GraphQL + CRD defaults).
- Fix OnChaos duration and stopOnFailure engine stop paths.
- Optional: expose cron timezone in experiment API for schedule UX.

**Why mentorship-scale:** Cross-repo coordination (litmus-go, chaos-runner, chaoscenter probe handlers),
plus fuzz/race testing culture.

## 3. Operator/runner lifecycle idempotency

**Problem cluster:** LITMUS-005, LITMUS-006, LITMUS-007, LITMUS-021

Execution plane lacks envtest coverage for restart, abort, and failure paths.

**Engineering work:**

- Envtest suite: runner restart, engine abort multi-result, failed runner pod.
- Harden `getChaosStatus` annotation parsing.

**Why mentorship-scale:** Kubernetes controller testing infrastructure and reconcile design,
similar to [litmus#3969](https://github.com/litmuschaos/litmus/issues/3969) operator upgrade theme.

## Credibility path

1. Land 2–3 Category A fixes with tests (LITMUS-011, LITMUS-022, LITMUS-013).
2. Open design issue for run FSM with this investigation linked (human author).
3. Propose mentorship on run projection or probe hardening with concrete test plan.