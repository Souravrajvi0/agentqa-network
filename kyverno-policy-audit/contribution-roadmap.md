# Contribution roadmap

Prioritized upstream contributions from this audit. **Do not auto-file** — human review recommended.

## P0 — BUG-001 (Class B)

**Title:** Background scan evaluates all NamespacedValidatingPolicies against cluster-scoped resources

**Suggested issue body outline:**

- Symptom: `ClusterPolicyReport` shows fails from `team-a/foo` when scanning cluster-scoped `Namespace/other-team`
- Root cause: `background/controller.go` calls `FetchNamespaced*(_, "")` which lists all namespaces
- Expected: parity with `NamespacedPolicy` webhook predicate — skip namespaced kinds when resource has no namespace
- Fix: guard `namespace != ""` before namespaced policy fetches; add `nsleak_test.go`
- Regression risk: ensure aggregate controller still passes `""` intentionally

**Estimated change size:** ~15 lines + test (Class **A** fix size, Class **B** impact).

**Mentorship angle:** Good example of **shared util misuse** — `FetchNamespaced*` meaning differs by call site.

---

## P1 — Align with in-flight CLI work (#17831)

After CLI predicate fix lands, audit **all** `NewEngine` call sites for consistent predicates:

- `pkg/controllers/report/utils/scanner.go`
- `pkg/controllers/report/background/controller.go` (policy list + engine)
- Any benchmark/fake paths

Single design doc: "Namespaced policy evaluation contract."

---

## P2 — Background operation fidelity (Class C)

Unify discussion on **which admission operation** background scan should simulate (#18436 class). Options:

- Configurable operation per policy
- Union evaluation across CREATE/UPDATE
- Document "audit assumes CREATE" explicitly for CEL policies

Cross-link VAP and CEL scanner.

---

## P3 — Test debt

- Implement `matcher_test.go` TODO cases for resourceNames + exclude permutations
- Chainsaw: NVPol + cluster-scoped resource negative test

---

## P4 — Policy label namespacing (unverified)

If #17633-class collisions reproduced, extend `PolicyLabel()` to include namespace for namespaced kinds.

---

## Artifact locations

| Deliverable | Path |
|-------------|------|
| Full audit bundle | `agentqa-network/kyverno-policy-audit/` |
| Reproduction test | `reproductions/background-nsleak/nsleak_test.go` |
| YAML fixtures | `reproductions/fixtures/` |

## Suggested PR sequence

1. Test-only PR with failing `TestNamespacedPolicyLeaksToClusterScopedResource`
2. Fix PR with `namespace != ""` guards + green CI
3. Optional: backport note for supported release branches