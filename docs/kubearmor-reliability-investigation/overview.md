# KubeArmor reliability investigation — overview

| Field | Value |
| --- | --- |
| Repository | [kubearmor/KubeArmor](https://github.com/kubearmor/KubeArmor) |
| Branch | `main` |
| Commit | `a95bfe7d1c3f1fe757d642cea96e26d569c3e07b` |
| Tag context | Stable pointer in tree: `v1.7.7` (#3040) |
| Investigation date | 2026-11-26 |
| Scope | Backend reliability: feeder, monitor, daemon lifecycle, controller bookkeeping, config, tests — not enforcement bypass |

## AI / contribution policy

- `CONTRIBUTING.md` requires DCO sign-off, human review, CI (go, Ginkgo, CodeQL, Trivy). No separate “no AI” policy found in-tree; security issues via [GitHub Security Advisories](https://github.com/kubearmor/KubeArmor/security/advisories/new) or `support@kubearmor.io` per `SECURITY.md`.
- This investigation produced **documentation and external regression examples only** — no commits to `kubearmor/KubeArmor`.

## What was executed locally

| Suite | Result |
| --- | --- |
| `go test ./feeder -count=1` | **PASS** (6s) |
| `go test ./common -count=1` | **FAIL** — `MatchExpIdentities` (see validated_bugs.md) |
| `go test ./core` | **setup failed** — missing embedded BPF `.o` without full `go generate` + LLVM toolchain |
| Ginkgo `tests/k8s_env/*` | **Not run** — requires cluster + LSM |

## Outcomes (counts)

| Bucket | Count |
| --- | --- |
| Validated bugs | 2 high-confidence + 1 medium (reproduced / code-proven) |
| Candidate bugs | 3 (need targeted tests) |
| Rejected / intentional | 4 |
| Known upstream (deduped) | 8+ |

## Deliverable index

- [architecture.md](./architecture.md)
- [coverage_map.md](./coverage_map.md)
- [findings.json](./findings.json)
- [validated_bugs.md](./validated_bugs.md)
- [candidate_bugs.md](./candidate_bugs.md)
- [rejected_findings.md](./rejected_findings.md)
- [github_dedup.md](./github_dedup.md)
- [contribution_strategy.md](./contribution_strategy.md)
- [mentorship_opportunities.md](./mentorship_opportunities.md)