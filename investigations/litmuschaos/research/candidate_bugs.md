# Candidate bugs (not yet upstream unit-tested)

Reachable in supported configs; high confidence from code review. Add tests in
`litmus` module mocks before filing issues.

## LITMUS-017 — RunSequence on every event

Every `ChaosExperimentRunEvent` update sets `RunSequence: experiment.TotalExperimentRuns + 1`
(`handler.go:1316`). Should be set once at create.

## LITMUS-018 — Fatalf on updatedBy decode

`handler.go:1215` — malformed `updatedBy` from subscriber terminates process.

## LITMUS-020 — Probe manifest revision

`handler.go:1126` uses latest revision, not `event.RevisionID`, when parsing probes for runs.

## LITMUS-021 — getChaosStatus panic

`chaos-operator` `getChaosStatus` splits annotation keys without length check (`812-813`).

## LITMUS-023 — UI phaseToUI collapse (UX candidate)

`web/src/utils/strings.ts:49-58` displays probe-failure phases as `COMPLETED`. Pair with LITMUS-008
only if product requires distinct UI; may be intentional simplification (see rejected R2).