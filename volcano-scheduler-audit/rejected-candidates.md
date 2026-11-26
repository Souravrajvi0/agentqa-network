# Rejected candidates

Candidates investigated but **not** promoted to confirmed bugs (duplicate, policy debate, insufficient proof, or observability-only).

| Candidate | Reason rejected |
|-----------|-----------------|
| Proportion `OverusedFn` vs `share` | Documented upstream [volcano#3695](https://github.com/volcano-sh/volcano/issues/3695) (reopened). |
| `RecoverOperations` partial session corruption | [volcano#5362](https://github.com/volcano-sh/volcano/issues/5362) open; [#5684](https://github.com/volcano-sh/volcano/issues/5684) closed `not_planned` but code unchanged. |
| `gangpreempt` missing `Discard` on failed replay | Extension of #5362; not separately filed. |
| Fairshare stale Prometheus series | [volcano#6023](https://github.com/volcano-sh/volcano/issues/6023). Scheduling correct; metrics wrong. |
| DRF preempting large running jobs | [volcano#908](https://github.com/volcano-sh/volcano/issues/908) — policy/design, not correctness. |
| Preempt + anti-affinity empty candidates | [volcano#2976](https://github.com/volcano-sh/volcano/issues/2976). |
| Queue allocated > capability single huge pod | [volcano#1860](https://github.com/volcano-sh/volcano/issues/1860) — partially addressed via dimension-aware checks; remaining behavior may be policy. |
| GPU memory oversubscription races | [volcano#2859](https://github.com/volcano-sh/volcano/issues/2859) — needs cluster concurrency repro. |
| `ResFloat642Quantity` int64 truncation | No production call path found in scheduler hot path during audit. |
| Backfill `UnPipeline` without `Statement` lifecycle | By design: `unPipeline` mutates session directly for best-effort paths; not a rollback bug. |
| Capacity reserved-task idempotency | Covered by `capacity_reserved_test.go`. |

## Borderline (monitor, no issue filed by this audit)

| Item | Notes |
|------|--------|
| Default `JobPipelined` permissive | Sharp edge for misconfigured plugins; documented invariant F7 — configuration hazard more than code bug. |
| `shareDelta = 1e-6` in DRF | Intentional float tolerance; not alone a bug. |