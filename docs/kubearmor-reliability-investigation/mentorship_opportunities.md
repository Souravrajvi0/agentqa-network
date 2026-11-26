# Mentorship-scale opportunities

LFX-scale work should be **multi-sprint, testable, and coordinated with maintainers**. Not every bug qualifies.

## Strong mentorship candidate: Daemon lifecycle + observability shutdown (#2295 + #2652)

| Dimension | Detail |
| --- | --- |
| Problem | Dual `StopChan`, incorrect `WaitGroup` accounting, BPF/monitor teardown races |
| Root cause theme | Global lifecycle state instead of `context.Context` per subsystem |
| Deliverables | Phase 1 context wiring; worker-tracked shutdown; integration tests; doc update |
| Dependencies | BPF CI, kind optional, maintainer buy-in (#2295 discussion) |
| Outcome | Reliable rollouts; no use-after-free class races on SIGTERM |
| Fit | **Category C** — systemic |

## Medium mentorship: Telemetry reliability program (#3052, #3014, throttling)

| Dimension | Detail |
| --- | --- |
| Problem | Silent drops, host `{0,0}` throttle bucket, missing dropped-event reporting |
| Deliverables | Unified throttle key design, metrics counters, feeder tests |
| Outcome | Operators trust alert volume; SRE dashboards |
| Fit | **Category C** (observability) — not LSM bypass |

## Medium mentorship: Controller ops at scale (#2800, operator Ready vs daemon)

| Dimension | Detail |
| --- | --- |
| Problem | O(n pods) reconcile, sleeps, operator phase `Running` vs per-node apply errors |
| Deliverables | Scoped reconciler, status aggregation design, envtest benchmarks |
| Fit | **Category B/C** boundary |

## Poor mentorship fit (keep as small PRs)

- KA-REL-001 alone — excellent **starter**, not mentorship-scale.
- Typo `GloabalImagePullSecrets` — one-line, not a project.

## Suggested narrative for LFX proposal

> “Harden KubeArmor node daemon shutdown and telemetry lifecycle: context-based cancellation, correct WaitGroup tracking, and regression tests proving BPF/monitor workers exit before resource teardown — building on open issues #2295 and #2652.”

Pair with contributor proof: merged unit test fix for KA-REL-001 first.