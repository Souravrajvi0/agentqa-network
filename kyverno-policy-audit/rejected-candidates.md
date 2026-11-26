# Rejected candidates

Candidates investigated and excluded from `confirmed-bugs.md`, with rationale.

## CAND-002 — CLI namespaced policy scope (known)

**Symptom:** `kubectl kyverno apply` can attribute results from a `NamespacedValidatingPolicy` in namespace A to a Pod in namespace B when no cluster predicate is wired.

**Verdict:** Duplicate of [#17830](https://github.com/kyverno/kyverno/issues/17830); fix in flight [#17831](https://github.com/kyverno/kyverno/pull/17831).

---

## CAND-003 — Background scan uses `admissionv1.Create` only

**Symptom:** Policies whose `matchConstraints.operations` are UPDATE-only, or validations referencing `request.operation`, may not be audited faithfully against live objects.

**Verdict:** Known for ValidatingAdmissionPolicy ([#18436](https://github.com/kyverno/kyverno/issues/18436), [#18442](https://github.com/kyverno/kyverno/pull/18442)). CEL path shares `scanner.go` lines 152/200/254. Classified as known/partial — not filed as new without cluster E2E proof on CEL policies.

---

## CAND-004 — Stale results on partial rescan (`keepResult`)

**Verdict:** Matches [#17368](https://github.com/kyverno/kyverno/issues/17368) / [#17405](https://github.com/kyverno/kyverno/issues/17405); partial fix history in [#17404](https://github.com/kyverno/kyverno/pull/17404).

---

## CAND-005 — Equivalent API group matching

**Verdict:** Tracked as [#18425](https://github.com/kyverno/kyverno/issues/18425).

---

## CAND-006 — CLI UPDATE `oldObject` semantics

**Verdict:** Documented in `processor/operation.go` and `apis/v1alpha1/test_result.go`. Single-manifest CLI limitation, not controller divergence.

---

## CAND-007 — Namespace selector on cluster-scoped resources

**Verdict:** Intentional copy of upstream `k8s.io/apiserver` webhook namespace matcher (`pkg/cel/matching/predicates/namespace/matcher.go` TODO is enhancement, not regression).

---

## CAND-008 — Policy label key collision

**Verdict:** Theoretical `PolicyLabel` = `vpol.kyverno.io/<name>` without namespace segment could confuse aggregate reconciliation when cluster and namespaced policies share a name. Not reproduced; related thematically to [#17633](https://github.com/kyverno/kyverno/issues/17633).

---

## Areas with strong regression coverage (no new bugs found)

- PolicyException TTL / cached compile expiry (`pkg/cel/compiler/exception.go`, vpol/mpol/dpol `exception_expiry_test.go`)
- Autogen exception rewrite ([#16952](https://github.com/kyverno/kyverno/issues/16952))
- GPol CRD downstream `resourceVersion` on sync drift (`pkg/background/gpol/dynamic_watcher_test.go`)
- IVPol autogen variant clobber ([#16729](https://github.com/kyverno/kyverno/issues/16729))
- Exception lister stale cache ([#16989](https://github.com/kyverno/kyverno/issues/16989))
- Extraction mode reconciler parity (vpol/mpol/ivpol `TestReconcile_ExtractionMode`)