# LitmusChaos monorepo architecture (investigation baseline)

## Investigation metadata

| Field | Value |
| --- | --- |
| Upstream repo | https://github.com/litmuschaos/litmus |
| Upstream branch | `master` |
| Upstream commit | `97a397fb2e3cb3e3ab41e9bd301b9143da547b6f` |
| Chaos operator commit | `01a76ca4faf44adaa5f5382031ad254920515ae0` |
| Chaos runner commit | `173b5ff68854cb0a3d470cdd5e3f4983283d7ec4` |
| Litmus-go commit | `fd7e7a5c5f2b96e769e140ef6aa4d23367186f98` |
| Local research branch | `feat/litmus-workflow-investigation-47a8` (agentqa-network) |
| Date | 2026-11-26 |

## AI / contribution policy

`CONTRIBUTING.md` requires DCO-signed commits, tests for bug fixes, coordination for large PRs.
No separate “no AI” policy was found in-tree; security issues use `.github/ISSUE_TEMPLATE/security-issue.md`
and `SECURITY.md` (responsible disclosure). This investigation does **not** open upstream issues or PRs.

## Planes

```
                    ┌─────────────────────────────────────┐
                    │ ChaosCenter (control plane)         │
                    │  web (React/TS)                     │
                    │  graphql/server (Go, gqlgen)        │
                    │  authentication (Go, gRPC/REST)     │
                    │  MongoDB (experiments, runs, probes)│
                    └──────────────┬──────────────────────┘
                                   │ WebSocket / GraphQL mutations
                    ┌──────────────▼──────────────────────┐
                    │ subscriber (cluster agent, Go)      │
                    │  Argo Workflow apply/watch          │
                    │  ChaosEngine informer               │
                    └──────────────┬──────────────────────┘
                                   │ CRs in target cluster
         ┌─────────────────────────┼─────────────────────────┐
         │ Execution plane (sibling repos, not all in litmus) │
         │ Argo → ChaosEngine → chaos-operator → chaos-runner │
         │      → Job (litmus-go) → ChaosResult               │
         └──────────────────────────────────────────────────┘
```

## `chaoscenter/` modules (litmus repo)

| Path | Language | Responsibility |
| --- | --- | --- |
| `chaoscenter/web` | TypeScript/React | Studio UI, run history, probe builders |
| `chaoscenter/graphql/server` | Go | Public GraphQL API, handlers, Mongo operators |
| `chaoscenter/authentication` | Go | AuthN (separate deployable) |
| `chaoscenter/subscriber` | Go | Infra agent: workflows, engine events, stop/delete |
| `chaoscenter/upgrade-agents` | Go | Control-plane upgrades |

GraphQL entry: `chaoscenter/graphql/server/server.go` (REST + gql, metrics, gRPC auth client).

## MongoDB collections (representative)

Defined under `graphql/server/pkg/database/mongodb/`:

- Chaos experiments (definitions, revisions, manifests, cron_syntax, recent runs)
- Chaos experiment runs (phase, execution_data, resiliency, faults_*, completed)
- Chaos infrastructure, probes, environments, chaos hub, image registry

Runs update via `chaosExperimentRun` mutation → `ChaosExperimentRunEvent` handler →
`UpdateExperimentRun` (only when `completed: false` unless insert).

## Experiment lifecycle (control plane)

1. **Create/Update** — `chaos_experiment` handler/ops: manifest processing (workflow, cron, standalone engine), probe refs, weights.
2. **Schedule** — CronWorkflow manifest; `cron_syntax` stored from `spec.schedule` only.
3. **Run** — Subscriber applies Workflow; Argo executes; subscriber streams `WorkflowEvent` → GraphQL.
4. **Monitor** — `ListExperimentRun`, stats, dashboard `recent_experiment_run_details`.
5. **Stop/Delete** — `ProcessExperimentRunStop/Delete` → subscriber `workflow_run_stop` / delete; must stop in-cluster engines.

## Kubernetes CRDs (execution plane)

- `ChaosExperiment`, `ChaosEngine`, `ChaosResult` — `litmuschaos/chaos-operator` API
- Argo `Workflow` / `CronWorkflow` — applied by subscriber

## Sibling repositories (out of tree but in lifecycle)

| Repo | Role |
| --- | --- |
| litmuschaos/chaos-operator | ChaosEngine reconcile, runner pod, abort |
| litmuschaos/chaos-runner | Job launch, engine status patches |
| litmuschaos/litmus-go | Fault + probe execution, ChaosResult |
| litmuschaos/chaos-exporter | Metrics from ChaosResult |
| litmuschaos/litmusctl | CLI |

## Recently active / thin-test areas (from tree scan)

- `chaos_experiment_run/handler.go` — large event handler, Fatalf on bad input
- `subscriber/pkg/events/workflow.go` — phase mapping, `getExperimentStatus`
- `subscriber/pkg/utils/workflow.go` — stop namespace
- `chaos_experiment/ops/service.go` — cron manifest (`processCronExperimentManifest`)
- Execution plane probe code — `litmus-go/pkg/probe` (limited `_test.go` + race-prone globals)

## Data ownership

| State | Owner of truth |
| --- | --- |
| Experiment definition | Mongo (ChaosCenter) |
| Run phase / execution graph | Mongo projection of subscriber events (not Argo directly) |
| In-cluster execution | ChaosEngine / ChaosResult / Argo Workflow |
| Fault verdict | ChaosResult (cluster), copied into subscriber payload |

Invariant failures occur when Mongo projection diverges from cluster (stop, phase mapping, namespace).