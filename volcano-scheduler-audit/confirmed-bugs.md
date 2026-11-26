# Confirmed bugs (novel or validated)

Only entries with a **violated contract** and **reproducible evidence** are listed. Severities assume typical multi-tenant batch clusters.

---

## VOL-DRF-001 — DRF preempt corrupts per-job simulated allocation

| Field | Value |
|-------|--------|
| **Class** | B |
| **Severity** | High |
| **Confidence** | High |
| **Location** | `pkg/scheduler/plugins/drf/drf.go` lines 248–255 |
| **Violated invariant** | D2 (each preemptee evaluated against same baseline unless selected) |

### Root cause

`PreemptableFn` keeps one `allocations[preemptee.Job]` pointer per job. **Every** iteration calls `.Sub(preemptee.Resreq)` **before** the victim test, mutating the map entry even when the task is rejected. Reclaim path correctly clones and restores (`drf.go` ~329–352).

### Minimal workload

- Cluster CPU capacity represented as `total.MilliCPU = 100000`.
- One victim job with two preemptable tasks: `80000` + `10000` mCPU (total allocated `90000`).
- Preemptor effective share `50000/100000` after request (e.g. `40000+10000`).
- Evaluate preemptees **in order**: large task first, small second.

### Expected vs actual victim set

| | Victims |
|---|---------|
| **Expected** | `[task1]` (only index 1: after removing 10k alone, share 0.9 > 0.5) |
| **Actual (buggy)** | `[]` — first iteration shrinks simulated alloc to `10000`, second sees share 0.1 |

### Reproduction

```bash
python3 /agent/repos/agentqa-network/volcano-scheduler-audit/reproductions/sim_drf_preempt.py
# Or review logic in reproductions/drf_preempt_mutating_sub_test.go
```

### Impact

DRF mis-filters victims when multiple tasks from one job are preemptees (common on consolidated nodes). Can block valid preemption or admit wrong victims — **priority / fairness contract** break, not mere suboptimality.

### Fix direction

Match reclaim pattern: `base := allocations[job].Clone(); rs := calculateShare(base.Sub(task), ...)`; call `allocations[job].Sub` only after `addVictim`.

### Upstream dedup

No matching GitHub issue found (searched DRF preempt / allocations Sub).

---

## VOL-CAP-001 — Capacity gang reclaim panics on orphaned task

| Field | Value |
|-------|--------|
| **Class** | A |
| **Severity** | Medium (scheduler crash) |
| **Confidence** | High |
| **Location** | `pkg/scheduler/plugins/capacity/capacity.go` lines 630–632 |
| **Violated invariant** | Victim filters must skip tasks whose `Job` is absent from session (defensive) |

### Root cause

`UnifiedEvictableFn` **gang reclaim** branch indexes `job.Queue` without checking `job == nil`. Legacy reclaim in the same file **does** guard (`capacity.go:490–495`). Priority and gang plugins guard similarly.

### Reproduction

See `reproductions/capacity_gang_reclaim_nil_job_test.sh` (static diff). Runtime: invoke `UnifiedEvictable` with `EvictionKindGangReclaim` and a candidate whose `Job` UID was removed from `ssn.Jobs` (PodGroup deleted, cache lag).

### Impact

Scheduler panic (nil pointer) → **hard outage** for that scheduling cycle (and possible process restart).

### Fix direction

Mirror legacy branch:

```go
job := ssn.Jobs[reclaimee.Job]
if job == nil {
    klog.Warningf(...)
    continue
}
```

---

## VOL-RES-001 — Scalar dimension skipped when left-hand `ScalarResources` is nil

| Field | Value |
|-------|--------|
| **Class** | A |
| **Severity** | Medium (latent) |
| **Confidence** | Medium |
| **Location** | `pkg/scheduler/api/resource_info.go` lines 501–507 |
| **Violated invariant** | Dimension-aware compare must honor `req` scalar keys |

### Root cause

After CPU/memory checks, if `r.ScalarResources == nil`, function returns `(true, [])` without inspecting `req.ScalarResources`.

### Workload

- `r = {MilliCPU: 1000}` (no scalar map)
- `rr = {MilliCPU: 4000, Memory: 8Gi}`
- `req = {ScalarResources: {nvidia.com/gpu: 1000}}`

### Expected vs actual

| | `allocatable` |
|---|---------------|
| **Expected** | `false` (GPU not tracked on lhs) |
| **Actual** | `true` |

### Reproduction

```go
// reproductions/resource_scalar_nil_req_test.go (logic)
```

Live plugin paths usually `Clone().Add()` before compare (materializes maps); risk for hand-built `Resource` values or future refactors.

### Fix direction

If `req` has non-zero scalars, treat missing lhs scalars as zero and continue comparison; do not early-return true.