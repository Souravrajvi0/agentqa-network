# Subsystem invariants

Invariants inferred from implementation contracts, tests, and docs. Violations are bug candidates.

## Admission webhooks

1. **Namespaced CEL policies** must not evaluate when `request.Namespace` ≠ policy namespace (`vpolengine.NamespacedPolicy`).
2. **Legacy kyverno.io policy writes** denied at HTTP layer (`handlers/legacy.go`).
3. **Generate/mutate-existing** synchronous response must not block on full generate work — enqueue `UpdateRequest`.
4. **Webhook configs** must not retain orphaned legacy paths without compat handler (regression tests in `pkg/controllers/webhook`).

## CEL compiler / engine

1. **Exceptions compile sorted** by namespace/name — first refusal message deterministic (`CompileExceptionsWithValidations`).
2. **Expired exceptions** skipped at eval without recompile.
3. **Full exemption** overrides partial allowed images/values regardless of exception order (#16053).
4. **Request budget** enforced on admission vs background contexts (`pkg/cel/requestbudget`).
5. **Autogen variants** must not clobber each other in reconciler cache keys (#16729).
6. **Extraction mode** must be set in reconciler same as provider (JobSet/custom CRD pod templates).

## Matching

1. **Exclude rules** evaluated before inclusive rules in `pkg/cel/matching/matcher.go`.
2. **Empty ResourceRules** = match all (subject to selectors).
3. **resourceNames** match exact name or `generateName` prefix.

## Background (UpdateRequest)

1. **Legacy UR** deleted not processed (`pkg/background/legacy.go`).
2. **GPol sync** must preserve downstream `resourceVersion` on CRD updates (regression tests).
3. **Generate labels** protect downstream from user tamper / ownership checks in webhooks.

## Reports

1. **Background scanner** must respect `config` resource filters.
2. **Match-condition skips** must not appear in PolicyReport results.
3. **MPol background:** if patch would change resource, report fail when status would be pass (mutation not applied).
4. **Aggregate** drops results for deleted policies; debounced namespace queue (~30s).
5. **Intended:** Namespaced policies only apply to resources in/adjacent to their scope — **violated by BUG-001** when `namespace==""` lists all NVPol/NMPol/NIVPol.

## Autogen

1. **metadata.name/namespace** paths not rewritten to pod template for exceptions.
2. **Immutable** exception inputs on rewrite (`DeepCopy`).

## CLI

1. **Target-constrained MPol** skipped on trigger inline eval (matches admission).
2. **Provider** path includes autogen + exception rewrite (parity target with reconciler).

## API / validation

1. **PolicyException** semantic validation in `pkg/validation/exception/`.
2. **policies.kyverno.io** types validated on admission via `pkg/webhooks/policy/`.

## Image verification (ivpol)

1. **Cache** refuses mutable verdict keys (security-class regression tests).
2. **Cosign** bundle / TUF interactions covered by extensive `pkg/image/verifiers/ivpol/cosign/*_test.go`.