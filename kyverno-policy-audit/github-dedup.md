# GitHub deduplication log

Searches run against `kyverno/kyverno` during this audit (November 2026), focused on confirmed and near-miss findings.

## BUG-001 (background namespaced policy leak)

| Query / method | Result |
|----------------|--------|
| `gh search issues --repo kyverno/kyverno "NamespacedValidatingPolicy cluster-scoped background"` | No direct match |
| `search_issues`: `namespaced policy cluster-scoped background` | No issue describing reports-controller `reconcile` + `FetchNamespaced*("",)` |
| Code search: `FetchNamespacedValidatingPolicies` call sites | Only `background/controller.go` uses resource namespace; `aggregate` and `resource` intentionally pass `""` |
| [#17830](https://github.com/kyverno/kyverno/issues/17830) | CLI apply scope — **related pattern**, different subsystem |
| [#17831](https://github.com/kyverno/kyverno/pull/17831) | CLI fix — not merged into background controller |
| [#18657](https://github.com/kyverno/kyverno/issues/18657) | Admission guard for empty request namespace — **does not** address policy listing |

**Conclusion:** Apparently **novel** for background-scan controller; file upstream issue referencing `background/controller.go:759` and predicate parity with webhook handlers.

## Near-miss references (rejected)

| ID | GitHub |
|----|--------|
| CAND-002 | #17830, #17831 |
| CAND-003 | #18436, #18442 |
| CAND-004 | #17368, #17404, #17405 |
| CAND-005 | #18425 |
| CAND-008 (unverified) | #17633 (thematic) |

## Historical fixes discovered via regression test comments (not re-reported)

| Area | Issue refs in tests |
|------|---------------------|
| MPol/GPol variables + patches | #16053 |
| GVR conversion | #17744 |
| Exception autogen rewrite | #16952 |
| GCE informer failure | #15856 |
| Webhook legacy pruning | multiple in `pkg/controllers/webhook/*_test.go` |