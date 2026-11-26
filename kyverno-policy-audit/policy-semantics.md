# Policy semantics (expected behavior)

Derived from upstream `ARCHITECTURE.md`, `docs/dev/reports/README.md`, `pkg/cel/AGENTS.md`, and webhook/engine contracts on current `main`.

## Policy kinds (`policies.kyverno.io`)

| Kind | Admission | Background scan | Async side effects |
|------|-----------|-----------------|-------------------|
| ValidatingPolicy (VPol) | Yes (if enabled) | Yes (if `evaluation.background`) | None |
| NamespacedValidatingPolicy (NVPol) | Yes, **policy namespace scope** | Yes, **should match admission scope** | None |
| MutatingPolicy (MPol) | Yes | Yes (inline mutate audit) | mutateExisting → UpdateRequest |
| NamespacedMutatingPolicy | Namespaced scope | Namespaced scope | mutateExisting |
| GeneratingPolicy (GPol) | Queues generation | N/A (not in background scanner same way) | UpdateRequest + sync |
| DeletingPolicy (DPol) | N/A | N/A | cleanup-controller schedules delete |
| ImageValidatingPolicy (IVPol) | Yes | Yes | None |
| PolicyException | Admission of exception CR | Compiled into policies | N/A |

Cluster-scoped kinds omit policy namespace; namespaced kinds carry `metadata.namespace` as **policy home**, distinct from resource namespace for cluster-scoped resources.

## Evaluation modes

- **Kubernetes mode:** Typed object schema from API discovery; used for in-cluster admission with `object` / `oldObject` / `request`.
- **JSON mode:** Untyped JSON evaluation; common in CLI and some VPol configurations.

## Match pipeline (CEL policies)

1. **Webhook routing** — GVR, operation, namespace/object selectors (`pkg/cel/matching`).
2. **Match conditions** — CEL boolean gates; failures can skip or fail per failure policy.
3. **Variables** — Named CEL sub-expressions (`variables.*`).
4. **Policy exceptions** — Sorted compile order; expiry re-checked at eval; partial (images/allowedValues) vs full exemption; compensating validations on exceptions.
5. **Validations / mutations / generate** — Kind-specific.

## Autogen

Pod-targeted policies may expand to workload controllers (Deployment, DaemonSet, CronJob, custom CRDs with extraction). **Exceptions** referencing `object.spec.*` must be rewritten per autogen variant (`pkg/cel/autogen/RewriteExceptions`).

## Admission vs background (documented intent)

- **Admission:** Evaluate on CREATE/UPDATE/DELETE (and CONNECT where applicable) with real `AdmissionRequest`.
- **Background:** Periodically evaluate **existing** resources against policies with background enabled; results feed same aggregation as admission audit results.
- **Invariant:** For the same policy + resource + effective match, pass/fail should align modulo operation-specific rules (known gap: scanner uses CREATE — see rejected CAND-003).

## Reporting semantics

- Only validation / image verification outcomes in PolicyReports (not mutate/generate success).
- `process` property: `admission review` vs `background scan` from `pkg/utils/report/results.go` `selectProcess`.
- Unscored policies: `fail` → `warn` in report conversion.
- Match-condition-only skips filtered from background reports (`filterMatchConditionSkips`).

## Exceptions and expiry

PolicyException `spec.expiresAt` must be honored even if compiled policy is cached (`compiler.Exception.IsExpired()` at evaluation).

## Failure policy

Per-policy `failurePolicy` (Fail/Ignore) affects whether CEL errors block or skip; toggles via `pkg/toggle`.

## CLI semantics (documented deltas)

- Namespace resolution: local variables → cluster GET with cache (`processor/AGENTS.md`).
- UPDATE with single resource file: `object` and `oldObject` are the same deep copy — does not simulate field-level updates unless extended.
- `CONNECT` operation in values files falls back to CREATE shape for CEL policies.
- Exception scope: `ExceptionScopeAll` vs CLI `--exception-namespace` mapping.

## Legacy

`kyverno.io/v1` ClusterPolicy/Policy execution removed (#17710). CRDs may remain frozen under `config/crds/kyverno/` for compatibility.