# Confirmed bugs

## BUG-001 — Background scan leaks namespaced CEL policies onto cluster-scoped resources

| Field | Value |
|-------|-------|
| **Classification** | B — evaluation / reporting correctness across controllers |
| **Confidence** | High |
| **Impact** | Incorrect audit reports; cross-tenant policy noise on cluster-scoped inventory; compliance dashboards show failures from policies that admission would never apply |
| **Security note** | Control *bypass* was not identified; this is erroneous *application* of controls in reporting/background paths (informational mis-attribution, not admission bypass) |

### Documented expected behavior

- `NamespacedValidatingPolicy` / `NamespacedMutatingPolicy` / `NamespacedImageValidatingPolicy` are scoped to the policy object's namespace for **admission** and for **exceptions** compilation (`pkg/cel/policies/vpol/engine/predicate.go` — `NamespacedPolicy(namespace)` returns false for `namespace == ""`).
- Background scanning should evaluate the same policy set that would apply at admission for a given resource context (`docs/dev/reports/README.md` — background scan evaluates policies against existing resources).

### Root cause

**File:** `pkg/controllers/report/background/controller.go`  
**Function:** `(*controller).reconcile` (approx. lines 758–801)

When reconciling a **cluster-scoped** resource, the work queue key uses `namespace == ""`. The controller unconditionally calls:

- `utils.FetchNamespacedValidatingPolicies(c.nvpolLister, namespace)`
- `utils.FetchNamespacedMutatingPolicies(c.nmpolLister, namespace)`
- `utils.FetchNamespacedImageVerificationPolicies(c.nivpolLister, namespace)`

**File:** `pkg/controllers/report/utils/utils.go`  
**Function:** `FetchNamespacedValidatingPolicies` (and siblings)

When `namespace == ""`, these helpers **list policies in all namespaces** (`nvpolLister.List(...)`), which is intentional for the **aggregate** controller (`aggregate/controller.go` passes `""` to build policy maps) but incorrect in the **per-resource background scan** path.

The shared `utils.Scanner` then runs those policies with **no** `NamespacedPolicy` predicate (unlike webhooks — see `pkg/webhooks/resource/vpol/handler.go`).

### Evaluation path trace

1. `background-scan-controller` queue → `reconcile(ctx, log, key, namespace, name)` with `namespace=""` for cluster-scoped objects.
2. Policy fetch includes every namespaced CEL policy cluster-wide.
3. `scanner.ScanResource` → `vpolengine.NewEngine` / `Handle` with `admissionv1.Create` and resource under scan.
4. Engine matches resource rules; namespaced policy in `team-a` can match a `Namespace` named `other-team`.
5. Results written to `ClusterEphemeralReport` → aggregated into `ClusterPolicyReport`.

### Fixtures

- Policy: `reproductions/fixtures/nvpol-team-a.yaml`
- Resource: `reproductions/fixtures/namespace-other-team.yaml`

### Reproduction

```bash
# From kyverno repo root (copy test from this audit bundle):
cp kyverno-policy-audit/reproductions/background-nsleak/nsleak_test.go pkg/controllers/report/background/
go test ./pkg/controllers/report/background/ -run TestNamespacedPolicyLeaksToClusterScopedResource -count=1 -v
```

**Actual (verified on shallow `main` clone, Nov 2026):**

```
namespaced policy "team-a/team-a-policy" (ns team-a) produced result "validation"/fail on cluster-scoped Namespace "other-team"
--- FAIL: TestNamespacedPolicyLeaksToClusterScopedResource
```

**Expected:** reconcile completes with **no** report results from `team-a/team-a-policy` for cluster-scoped Namespace `other-team` (admission would skip via `NamespacedPolicy`).

### Proposed fix direction

In `background/controller.go` `reconcile`, only fetch namespaced policy kinds when `namespace != ""`:

```go
if c.nvpolLister != nil && namespace != "" {
    nvpols, err := utils.FetchNamespacedValidatingPolicies(c.nvpolLister, namespace)
    // ...
}
```

Mirror for `nmpolLister` and `nivpolLister`. Add a regression test (the bundled `nsleak_test.go`) and consider an integration chainsaw case with a NamespacedValidatingPolicy + cluster-scoped trigger.

### GitHub deduplication evidence

Searches performed (no open issue found for **background controller** specifically):

- `gh search issues --repo kyverno/kyverno "NamespacedValidatingPolicy cluster-scoped background"`
- GitHub code search: `FetchNamespacedValidatingPolicies` + background scan
- Related **CLI-only** scope bug: [#17830](https://github.com/kyverno/kyverno/issues/17830), fix [#17831](https://github.com/kyverno/kyverno/pull/17831) — does not mention reports-controller.
- Admission empty-namespace guard: [#18657](https://github.com/kyverno/kyverno/issues/18657) — closed; does not cover background scan listing all namespaces.

**Status:** Apparently novel for the reports/background path; high confidence on behavior, medium-high on issue tracker novelty (wording-dependent).