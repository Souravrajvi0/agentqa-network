# Scheduler interaction map

## Session open → plugins → actions → close

```
Cache.Snapshot()
    → Session.Jobs/Nodes/Queues
    → foreach tier: Plugin.OnSessionOpen
           ├─ register JobOrderFn, PredicateFn, PreemptableFn, ...
           ├─ initialize queue attrs (proportion/capacity/drf maps)
           └─ subscribe EventHandler {Allocate, Deallocate}
    → foreach action in config:
           enqueue / allocate / backfill / reclaim / preempt / gang*
    → foreach tier: Plugin.OnSessionClose
    → closeSession → API status for PodGroup + Queue
```

## Statement vs cache

```
Statement.Evict/Pipeline/Allocate  ──► mutates Session (Jobs, Nodes, plugin event handlers)
        │
        ├─ Discard() ──► rollback session only
        └─ Commit()  ──► cache.Evict / cache.AddBindTask (async bind workers)
```

## Dry-run / replay (topology & gang actions)

```
allocate (hypernode search):
    dry-run Statement(s)  →  SaveOperations(best)  →  finalStmt.RecoverOperations(best)
                                    │                              │
                                    └─ plan is cloned tasks ───────┘

gangpreempt / gangreclaim:
    select bundles → BuildNominationPlanInDomain → SaveOperations → stmt.RecoverOperations
        → JobPipelined? → stmt.Commit() : stmt.Discard()
```

**Critical interaction**: `RecoverOperations` applies ops **directly** to session; on mid-plan failure, callers must `Discard()` the replay statement (often missing — see `allocate.go:558`, `gangpreempt.go:180`).

## Plugin interaction on preemption

```
preempt / gangpreempt victim loop
    → candidates from nodes/domains
    → Session.Preemptable / UnifiedEvictable (tier walk)
           ├─ gang: MinAvailable floor
           ├─ priority: class ordering
           ├─ drf: share comparison  ◄── bug: mutates simulated allocation
           ├─ capacity / proportion: queue deserved/guarantee
           └─ pdb: disruptions allowed
    → Statement evict + pipeline victims
```

## Proportion vs capacity on queue overuse

| Check | Proportion | Capacity |
|-------|------------|----------|
| `Overused` | `deserved.LessEqual(allocated)` (all dimensions) | `share > 1` (max dimension) |
| Reclaim filter | `allocated > deserved` per victim simulation | `GreaterPartlyWithRelevantDimensions` |

These semantics differ by design in places (see capacity preemptive comment) but `Overused` vs `share` breaks reclaim skip in proportion (#3695).

## Cache events ↔ session

Informers update live cache between cycles. Within a cycle, only session+statement state drives decisions. Shard coordinator pauses cache structure updates during session (`IsSessionRunning`).