# Background scan: namespaced policy evaluated on cluster-scoped resources

## Run unit reproduction

```bash
cd /path/to/kyverno
cp kyverno-policy-audit/reproductions/background-nsleak/nsleak_test.go pkg/controllers/report/background/
go test ./pkg/controllers/report/background/ -run TestNamespacedPolicyLeaksToClusterScopedResource -count=1 -v
```

Expected on current `main`: test **fails** with a message like:

```
namespaced policy "team-a/team-a-policy" (ns team-a) produced result "validation"/fail on cluster-scoped Namespace "other-team"
```

## Fixtures

- `../fixtures/nvpol-team-a.yaml` — always-fail NamespacedValidatingPolicy in `team-a`
- `../fixtures/namespace-other-team.yaml` — cluster-scoped Namespace resource under scan