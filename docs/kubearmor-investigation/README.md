# Rank 4 — kubearmor/KubeArmor investigation

Implementation-correctness review of policy compilation, events, alerting, and operator reconcile. No KubeArmor PRs, no live bypass work.

- [policy-semantics.md](./policy-semantics.md) — CRDs, selectors, Allow/Audit/Block, merge, fixtures
- [enforcement-pipeline.md](./enforcement-pipeline.md) — org map, daemon vs operator vs relay, BPF apply, tests
- [findings.md](./findings.md) — classified A/B/C, GitHub dedup, private track
- [regression/match_identities_test.go](./regression/match_identities_test.go) — unit test that failed on upstream `MatchExpIdentities`

Upstream tree: `https://github.com/kubearmor/KubeArmor` `main` as of 2026-11-26.
