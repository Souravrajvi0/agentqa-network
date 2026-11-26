# Contribution strategy

No automatic upstream submissions. Suggested order for **human** contributors with DCO.

## Quick wins (Category A, single PR each)

1. **LITMUS-011** — one-line fallback `[]byte(event.ExecutionData)` + handler test.
2. **LITMUS-022** — split `err != nil` from `len==0`; return empty list without `err.Error()` panic.
3. **LITMUS-013** — add `is_removed: false` to `GetExperimentRunStats` `$match`.
4. **LITMUS-012** — extend GraphQL `ExperimentRunStatus` enum; regenerate gqlgen; sync filters.
5. **LITMUS-004** — `* time.Second` in chaos-runner `watchJob.go`.
6. **LITMUS-018** — return error instead of `Fatalf` in run event handler.

## Medium (Category B, 1–3 files)

1. **LITMUS-001 + LITMUS-002 + LITMUS-014** — `litmus-go` probe package (args, duration, `strings.ToLower` on modes, remove package `err`).
2. **LITMUS-010** — pass resolved admin namespace into `StopChaosEngineState` (reuse `getAdminModeNamespace` / workflow parameters).
3. **LITMUS-005 + LITMUS-006 + LITMUS-007** — chaos-runner/operator lifecycle tests with envtest/fake client.
4. **LITMUS-017 + LITMUS-020** — run handler: immutable RunSequence, revision-aware probe parse.

## Coordinated (Category C — multiple PRs or mentorship)

### Theme: Run projection truth (LITMUS-008, LITMUS-009, LITMUS-012)

- Subscriber: map Argo Failed → Error; derive `Completed_With_Probe_Failure` from `ExperimentVerdict`.
- GraphQL: enum + stats; stop path: either `completed` stays false until final event, or allow terminal upsert.
- Integration test: fake subscriber payload → Mongo phase assertions.

### Theme: Probe execution reliability (LITMUS-001–003, LITMUS-014)

- Add `go test -race` job on `litmus-go/pkg/probe`.
- Document mode casing in CRD/kubebuilder validation (optional webhook).

## Validation expectations for upstream PRs

Per `CONTRIBUTING.md`: unit tests, local ChaosCenter test if GraphQL/subscriber touched,
screenshots only if UI changes.

## This repository

Research lives under `investigations/litmuschaos/`. Contract tests are **not** upstream patches;
copy patterns into litmus modules when contributing.