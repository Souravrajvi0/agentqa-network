# Contribution strategy

Credibility path: fix **one validated, unreported bug with unit test**, then tackle a **known open issue** with an existing maintainer thread.

## Tier 1 — Quick wins (Category A)

### 1. KA-REL-001 `MatchExpIdentities` (recommended first PR)

- **Change:** After In loop, require `inMatched` before NotIn sets true; always compile NotIn in `CreateSecurityPolicy` regardless of `hasInOperator` order.
- **Tests:** Table-driven tests in `KubeArmor/common` (4 cases: In only, NotIn only, both, neither).
- **Risk:** Low; touches selector bookkeeping only.
- **Process:** DCO sign-off, `go test ./common`, full CI.

### 2. KA-REL-005 Developer docs

- **Change:** `contribution/development_guide.md` — add “Run unit tests like CI” snippet mirroring `ci-test-go.yml` (llvm, libbpf, `go generate`).
- **Risk:** Trivial.

## Tier 2 — Substantial (Category B)

### 3. Join #2652 — `WgDaemon` fix

- **Do not open duplicate issue.** Comment on #2652 with test plan; implement WaitGroup on actual worker exit (or migrate per #2295 Phase 1).
- **Tests:** Shutdown integration test with short-lived mock monitor.

### 4. #3015 — informer upsert

- **Change:** UpdateFunc append if missing policy name.
- **Tests:** Fake client resync simulation.

### 5. #2800 — PodRefresher

- Larger refactor; benchmark in `controller` package. Good **second** project after credibility from #1.

## Tier 3 — Not recommended first

- Full context shutdown (#2295): mentorship-scale.
- CRD status pipeline (KA-REL-004): needs design with maintainers.

## What we did **not** do

- No automatic GitHub issues/PRs to kubearmor/KubeArmor from this agent.
- No production file edits in upstream clone (regression tests live only under `agentqa-network/docs/...`).