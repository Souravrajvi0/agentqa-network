# Rejected findings (adversarial review)

Maintainer-style invalidation. Not reported as bugs.

## R1 — `jobCleanUpPolicy: retain` leaves pods/jobs

**Reason:** Documented behavior. Operator and runner log “skip deletion.” Not a contract violation.

## R2 — `phaseToUI` maps probe failure phases to “COMPLETED”

**File:** `chaoscenter/web/src/utils/strings.ts:49-58`

**Reason:** Appears intentional UI simplification (treat terminal non-error as “completed” badge).
**Impact:** Misleading UX but not API incorrectness; backend still stores raw phase when subscriber
sends it (today it often does not — see LITMUS-008). Reclassified as **candidate** LITMUS-023 only
if product expects distinct UI for probe failure.

## R3 — ChaosEngine created with `engineState: stop` and empty status

**Reason:** Edge manifest; reconcile no-op is undocumented but rare in supported Studio flows.
Listed as operator footgun in invariants, not validated user bug.

## R4 — HTTP probe connection errors → ERROR not FAIL

**Reason:** Known discussion [litmus#5351](https://github.com/litmuschaos/litmus/issues/5351) (closed).

## R5 — Target application crash during pod-delete

**Reason:** Chaos effect, not platform bug.

## R6 — `strings.ReplaceAll` stripping `{{` in cron manifest processing

**Reason:** Documented workaround for unmarshaling ChaosEngine templates in
`processCronExperimentManifest`; ugly but intentional for current pipeline. Risk of corrupting
literal `{{` in data is hypothetical without a reproducing manifest.

## R7 — Duplicate phase filters in `ListExperimentRun`

**Reason:** `ExperimentRunStatus` and `ExperimentStatus` filters both apply to `phase`; redundant
API surface, not incorrect alone.

## R8 — GraphQL server `log.Fatalf` on TLS misconfig at startup

**Reason:** Fail-fast for misconfiguration; not request-path bug (distinct from LITMUS-018 event path).