# Deep codebase bug investigation — KubeArmor (reliability)

**Upstream:** [kubearmor/KubeArmor](https://github.com/kubearmor/KubeArmor) @ `a95bfe7` (`main`, 2026-11-26)

Focus: Go/K8s backend reliability (feeder, monitor, daemon lifecycle, controller bookkeeping). Not enforcement bypass work.

## Artifacts (Phase 9)

| File | Purpose |
| --- | --- |
| [overview.md](./overview.md) | Summary, commit, tests executed |
| [architecture.md](./architecture.md) | Components, init/shutdown, telemetry flow |
| [coverage_map.md](./coverage_map.md) | Multi-pass coverage |
| [findings.json](./findings.json) | Machine-readable findings |
| [validated_bugs.md](./validated_bugs.md) | Reproduced / code-proven |
| [candidate_bugs.md](./candidate_bugs.md) | Hypotheses needing tests |
| [rejected_findings.md](./rejected_findings.md) | Skeptical review rejections |
| [github_dedup.md](./github_dedup.md) | Issue/PR overlap |
| [contribution_strategy.md](./contribution_strategy.md) | Suggested PR order |
| [mentorship_opportunities.md](./mentorship_opportunities.md) | LFX-scale themes |
| [regression/](./regression/) | Copy-in unit tests for upstream |

Related (policy-centric pass): [../kubearmor-investigation/](../kubearmor-investigation/) on branch `feat/kubearmor-investigation-0253`.