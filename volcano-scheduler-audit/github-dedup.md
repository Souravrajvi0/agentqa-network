# GitHub deduplication log

Searches performed Nov 2026 against `volcano-sh/volcano` (issues + code search).

| Finding ID | Query / method | Match | Disposition |
|------------|----------------|-------|-------------|
| VOL-DRF-001 | `DRF preempt victim`, `drf allocations Sub` | No exact match; #908 policy, #390 gang/DRF interaction | **Report as new** |
| VOL-CAP-001 | `capacity UnifiedEvictable gang reclaim nil` | Code search shows guard in legacy path only | **Report as new** |
| VOL-RES-001 | `LessEqualWithDimension scalar` | No issue; related #3537 dimension-aware enqueue (feature) | **Report as new** |
| VOL-STMT-001 | `RecoverOperations statement` | #5362 open, #5778 nil node panic (closed), #5684 closed N/A | Duplicate |
| VOL-PROP-001 | `proportion overused LessEqual` | #3695 reopened, describes inverted semantics | Duplicate |
| VOL-GANG-001 | `RecoverOperations gangpreempt` | Same cluster as #5362 | Duplicate extension |
| VOL-FS-001 | `namespace_share decayed` | #6023 open | Duplicate |

## Related PRs / design docs

- `docs/design/evictablefn-evolution-for-gang-eviction.md` — documents fragile nil `job` contracts; supports VOL-CAP-001 fix.
- Capacity preemptive comment `capacity.go:719-721` — explicit opposite-of-proportion-overused semantics for reclaim.

## Recommended filing order

1. **VOL-DRF-001** — isolated plugin fix + unit test in `pkg/scheduler/plugins/drf`.
2. **VOL-CAP-001** — one-line guard + regression in `capacity_test.go`.
3. **VOL-RES-001** — extend `resource_info_test.go` + fix helper.
4. Comment on #5362 linking gang action paths still missing `Discard`.