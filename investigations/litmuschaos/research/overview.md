# LitmusChaos deep investigation — overview

## Purpose

Multi-pass correctness investigation of `litmuschaos/litmus` (ChaosCenter control plane) and
execution siblings, to surface **previously unreported** bugs suitable for open-source
contribution and LFX-scale follow-on work. No upstream issues or PRs were filed.

## Scope

- In scope: GraphQL/Mongo lifecycle, subscriber event mapping, scheduling metadata, metrics
  aggregation, TS/GraphQL contract drift, and execution-plane bugs that break platform
  contracts (probes, engine status, cleanup).
- Out of scope: Attacking user clusters, cosmetic UI, intentional chaos-induced app failures.

## Baseline commits

| Repository | SHA |
| --- | --- |
| litmus | `97a397fb2e3cb3e3ab41e9bd301b9143da547b6f` |
| chaos-operator | `01a76ca4faf44adaa5f5382031ad254920515ae0` |
| chaos-runner | `173b5ff68854cb0a3d470cdd5e3f4983283d7ec4` |
| litmus-go | `fd7e7a5c5f2b96e769e140ef6aa4d23367186f98` |

## Results summary

| Bucket | Count |
| --- | --- |
| Validated (repro test or direct panic proof) | 16 |
| Candidate (code review, needs upstream unit test in litmus module) | 4 |
| Rejected after skeptic review | 6 |

**Category A (localized):** 6 — API parsing, stats filter, enum drift, ListExperimentRun panic, executionData fallback, cron metadata.

**Category B (multi-component):** 12 — probes, runner/operator, subscriber phase/namespace, stop vs Mongo.

**Category C (mentorship-scale):** 2 themes — (1) experiment run projection vs cluster truth; (2) probe execution hardening across litmus-go + portal.

## Artifacts

| File | Contents |
| --- | --- |
| `architecture.md` | Module map, lifecycle, data ownership |
| `coverage_map.md` | Test gaps by subsystem |
| `findings.json` | Machine-readable findings |
| `validated_bugs.md` | Confirmed with evidence |
| `candidate_bugs.md` | Needs litmus-module test harness |
| `rejected_findings.md` | Intentional or unproven |
| `github_dedup.md` | Issue/PR search log |
| `contribution_strategy.md` | Suggested PR sequence |
| `mentorship_opportunities.md` | LFX-aligned themes |
| `../repros/` | Standalone Go contract tests (ran 2026-11-26) |

## Regression tests

```bash
cd investigations/litmuschaos/repros && go test -v ./...
```

All tests encode **current** upstream behavior vs documented contract (they pass when bugs still exist).

## Maintainer skepticism

Each validated item was checked for: unsupported configs, duplicate handling elsewhere,
and test artifacts that assert bugs rather than contracts. See `rejected_findings.md`.

## Related prior doc

`../workflow-invariants.md` and `../findings.md` (narrative, first pass); this `research/`
tree is the formal Phase 9 deliverable set.