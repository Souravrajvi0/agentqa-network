# Contribution roadmap

Prioritized upstream contributions for `volcano-sh/volcano`. **Do not open PRs without maintainer approval** (per audit charter).

## Class A — Small, independent fixes

| ID | Effort | PR outline |
|----|--------|------------|
| VOL-CAP-001 | ~15 LOC | Nil `job` check in gang reclaim `UnifiedEvictableFn`; mirror line 490 pattern. Test: orphaned candidate does not panic. |
| VOL-RES-001 | ~10 LOC + test case | Fix early return in `LessEqualWithDimensionAndResourcesName`; add case to `resource_info_test.go`. |

## Class B — Algorithmic / accounting

| ID | Effort | PR outline |
|----|--------|------------|
| VOL-DRF-001 | ~20 LOC + test | Clone-before-Sub in `preemptableFn`; add `TestDRFPreemptable_MultipleTasksSameJob` with two-task ordering. |
| VOL-STMT-001 (existing) | Cross-file | On `RecoverOperations` error: `stmt.Discard()` in allocate + gang* actions; optional undo inside `RecoverOperations`. Coordinate with #5362 author. |
| VOL-PROP-001 (existing) | Policy | Align `OverusedFn` with `share > 1` or `GreaterPartly`; discuss on #3695 before coding. |

## Class C — Systemic (reference only)

| Theme | Notes |
|-------|--------|
| Statement / dry-run consistency | Unify speculation (`Statement`) vs direct `ssn.Allocate` (`backfill`); document invariants for plugin authors. |
| Dimension-aware queue contracts | Finish cross-plugin migration started in #3537 / capacity comments. |
| Metrics vs scheduling | Fairshare gauge lifecycle (#6023). |

## Suggested regression assets to upstream

From `volcano-scheduler-audit/reproductions/`:

- `drf_preempt_mutating_sub_test.go` → move to `pkg/scheduler/plugins/drf/drf_preempt_test.go`
- `resource_scalar_nil_req_test.go` → fold into `api/resource_info_test.go`
- Shell harnesses can be dropped after tests land.

## Review checklist for maintainers

- [ ] Victim simulation loops never mutate shared accounting before selection
- [ ] All `UnifiedEvictable` paths guard `ssn.Jobs[task.Job] == nil`
- [ ] Every `RecoverOperations` failure path calls `Discard` on the active statement
- [ ] `Overused` semantics consistent with exported `share` metrics