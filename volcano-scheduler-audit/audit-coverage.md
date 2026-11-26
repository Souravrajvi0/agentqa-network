# Audit coverage

## Methodology

1. Repository architecture mapping (framework, actions, cache, api, plugins, controllers, webhooks).
2. Static review of resource accounting, statement rollback, preempt/reclaim loops, gang paths, queue plugins.
3. Cross-reference with existing unit/E2E tests and local simulations in `reproductions/`.
4. GitHub issue/PR deduplication (`github-dedup.md`).

## Subsystems reviewed

| Subsystem | Files / scope | Depth |
|-----------|----------------|-------|
| Framework session/statement | `framework/session.go`, `statement.go`, `session_plugins.go` | Full |
| Actions | `enqueue`, `allocate`, `backfill`, `reclaim`, `preempt`, `gangpreempt`, `gangreclaim` | Full read of control flow |
| API resources | `resource_info.go`, `job_info.go`, `node_info.go` | Full + tests |
| Cache | `cache.go` snapshot, session hooks, bind path | Medium |
| Gang plugin | `plugins/gang/gang.go` | Full |
| Proportion | `plugins/proportion/proportion.go` | Full reclaim/overused/enqueue |
| Capacity | `plugins/capacity/capacity.go` | UnifiedEvictable + hierarchy |
| DRF / HDRF | `plugins/drf/drf.go`, `hdrf_test.go` | Preempt/reclaim paths |
| Fairshare | `fairshare.go` | Medium (metrics #6023 known) |
| Backfill | `backfill.go` | Medium |
| Controllers | `job/`, `podgroup/` entry points | Light (lifecycle edges) |
| Admission | `webhooks/admission/*` | Light |
| Predicate/score | `plugins/predicates`, `nodeorder` | Sampled |
| Topology | `hypernode`, `task-topology`, `network-topology-aware` | Sampled |
| Unschedulable cache | `unschedulable/` | Tests reviewed |

## Subsystems not exhaustively fuzzed

- Device share / GPU memory (`deviceshare`, #2859 cluster repro).
- Full E2E multi-node races.
- Every dynamic resource allocation (DRA) dimension combo.
- Webhook validation matrix across all CRDs.

## Test execution

| Test | Result |
|------|--------|
| `pkg/scheduler/api` `TestLessEqualWithDimensionAndResourcesName` | PASS (existing; gap not covered) |
| `pkg/scheduler/framework` `TestRecoverOperations_PipelinePreservesEvictionFlag` | PASS |
| DRF preempt simulation (Python + `drf_preempt_mutating_sub_test.go` logic) | FAIL expected on buggy path |
| External `reproductions` Go module against volcano | Blocked by nested `volcano.sh/apis` replace; api-only tests documented |

## Confirmed vs reported

| Finding | New upstream report? |
|---------|----------------------|
| DRF preempt `Sub` mutation | **Yes** (no matching issue located) |
| Capacity gang reclaim nil `job` | **Yes** |
| `LessEqualWithDimensionAndResourcesName` scalar nil | **Yes** (latent) |
| RecoverOperations partial rollback | No (#5362, #5684) |
| Proportion `OverusedFn` vs share | No (#3695) |