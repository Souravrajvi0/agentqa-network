# Scheduling invariants (Volcano)

Notation: **S** = session state at cycle; **Σ** = snapshot at `OpenSession`.

## Framework & statement

| ID | Invariant | Enforcement |
|----|-----------|---------------|
| F1 | `PodGroupOldState` fixed after open | `session.go` |
| F2 | Failed single `Pipeline`/`Allocate` rolls back via deferred undo | `statement.go` |
| F3 | Until `Commit`, no cache `Evict`/`AddBindTask` | `statement.go` |
| F4 | `Discard` reverses `operations` in LIFO order | `statement.go` |
| F5 | **`RecoverOperations` must leave S unchanged on error** (violated today) | See confirmed bugs |
| F6 | `JobReady`: all enabled plugins must pass (AND) | `session_plugins.go` |
| F7 | Default `JobPipelined` = true if no plugin votes | `session_plugins.go` |

## Actions

| ID | Invariant |
|----|-----------|
| A1 | `enqueue` only from `job.IsPending()` |
| A2 | `allocate`/`reclaim`/`preempt` commit only when pipelined/ready gates pass |
| A3 | `reclaim` skips queues where `Overused` |
| A4 | `backfill` skips pending jobs and tasks with scheduling resource requests |

## Cache & snapshot

| ID | Invariant |
|----|-----------|
| C1 | `S.Nodes` ⊆ ready nodes at open |
| C2 | `Session.TotalResource` = Σ allocatable |
| C3 | Jobs without PodGroup absent from snapshot |

## Node / resource accounting

| ID | Invariant |
|----|-----------|
| N1 | `FutureIdle = Idle + Releasing - Pipelined` |
| N2 | Binding `AddTask` requires `Resreq ≤ Idle` |
| N3 | **Resource conservation**: committed allocations match sum of task `Resreq` on nodes + queue plugin accounting |

## Gang

| ID | Invariant |
|----|-----------|
| G1 | `IsReady`: `ReadyTaskNum + PendingBestEffortTaskNum ≥ MinAvailable` |
| G2 | Preempt victims: simulated occupancy **>** `MinAvailable` after decrement |
| G3 | Victim tasks ⊆ `PreemptableStatus` (Bound/Running) |

## Proportion / capacity fairness

| ID | Invariant |
|----|-----------|
| Q1 | `share(q) = max_d allocated(q,d)/deserved(q,d)` | `updateQueueAttrShare` |
| Q2 | **Intended**: `overused(q)` iff ∃d : allocated(q,d) > deserved(q,d) (proportion `OverusedFn` diverges — #3695) |
| Q3 | Capacity: preemptive iff ∃ ancestor dimension with `allocated < deserved` for request | comment at `capacity.go:719` |
| Q4 | Reclaim victim selection must simulate per-queue `allocated` without mutating baseline for rejected candidates (DRF violates) |

## DRF

| ID | Invariant |
|----|-----------|
| D1 | Preemptor may take preemptee only if preemptor share < preemptee share after hypothetical removal (±`shareDelta`) |
| D2 | When evaluating multiple preemptees from one job, each evaluation uses the **same** pre-eviction allocation unless that preemptee is chosen |

## Controllers (boundary)

| ID | Invariant |
|----|-----------|
| B1 | Job controller matches UID on updates |
| B2 | Admission rejects PodGroups for closed queues |