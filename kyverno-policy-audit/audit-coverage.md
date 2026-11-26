# Audit coverage

What was reviewed, exercised, and what remains under-tested.

## Repository exploration

| Area | Depth | Notes |
|------|-------|-------|
| `ARCHITECTURE.md`, nested `AGENTS.md` | Read | CEL migration boundaries |
| `pkg/cel/**` | Medium–high | compiler, autogen, matching, all policy kinds |
| `pkg/webhooks/**` | Medium | handlers, legacy, server routes |
| `pkg/controllers/report/**` | **High** | background reconcile, scanner, aggregate utils |
| `pkg/background/gpol/**` | Medium | sync regression tests reviewed |
| `cmd/cli/kubectl-kyverno/processor/**` | Medium | operation shape, provider wiring |
| `pkg/engine/**` | Low–medium | JMESPath, patches (legacy shared lib) |
| `api/**`, `config/crds/**` | Low | versioning docs |
| `test/conformance/chainsaw/**` | Sampled | autogen, exceptions, globalcontext paths |
| `test/integration/**` | Sampled via grep | regression comment index |

## Tests executed locally

```text
go test ./pkg/cel/autogen/... ./pkg/cel/matching/... -short
go test ./pkg/cel/policies/vpol/compiler/... -run TestEvaluate
go test ./pkg/utils/report/...
go test ./pkg/controllers/report/background/ -run TestNamespacedPolicyLeaksToClusterScopedResource  # FAIL (bug repro)
```

Go module download required full network; subsequent packages cached.

## Coverage gaps (opportunities for future audit)

| Gap | Risk |
|-----|------|
| `pkg/cel/matching/matcher_test.go` TODO (name/exclude) | Medium — logic appears K8s-aligned but under-tested |
| Namespace selector on cluster-scoped resources (TODO in matcher) | Low — upstream parity |
| MPol JSON patch Object initializer typing (TODO in `json.go`) | Medium — partial runtime checks only |
| Aggregate `reportUUIDToPolicyCache` concurrency | Low — reviewed structure only |
| Helm/chart webhook config vs code paths | Not reviewed |
| Multi-replica leader election races | Not reviewed |
| chainsaw E2E full matrix | Not run (resource intensive) |

## Differential testing performed

| Comparison | Outcome |
|------------|---------|
| Webhook `NamespacedPolicy` vs background `reconcile` policy fetch | **Mismatch → BUG-001** |
| CLI provider vs webhook predicate | Known issue #17830 (not novel) |
| Provider vs reconciler autogen | Regression tests present; no new gap found |
| Scanner CREATE vs admission UPDATE | Known class #18436 |

## Security-sensitive paths

- Image verification / cosign: not probed for bypass; regression tests indicate active hardening.
- `pkg/engine/apicall` SSRF: not re-audited.
- No security-control bypass submitted as public finding.