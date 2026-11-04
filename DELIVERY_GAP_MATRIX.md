# Delivery pipeline gap matrix

Audit date: 2026-11-04 (implementation pass on `feat/delivery-pipeline-2ff4`).

| Capability | Database | Backend | Frontend | Tests | Status |
| --- | --- | --- | --- | --- | --- |
| Developer changes | ✓ Extended `DeveloperChangeRequest` (branch, commit, agent attribution, lifecycle enums) | ✓ Existing CRUD + expanded transitions + timeline events | ✓ Developer Changes + Delivery pipeline rows | ✓ Unit transitions | **Implemented** |
| Design decisions | ✓ Existing + clarifications linked to changes/tests | ✓ Existing APIs | ✓ Design Decision Center | Partial (integration) | **Implemented** (clarification workflow partial UI) |
| CI runs | ✓ `CiRun`, indexes, idempotent unique key | ✓ GitHub webhook, mapping, simulate endpoint | ✓ Delivery + detail CI section | ✓ Mapping + signature unit tests | **Implemented** |
| Builds | ✓ commitSha, branch, repository, sourceProvider | ✓ Created on successful CI (GitHub) | ✓ Shown on pipeline / inbox | — | **Implemented** |
| Retest scopes | ✓ `RetestScope` versioning | ✓ Propose + QA lead approve | ✓ Detail view (scope summary) | — | **Implemented** (modify/reject flows via API only) |
| QA handoffs | ✓ `QAHandoff` | ✓ Created on approved scope + CI gate; inbox API | ✓ QA Inbox + accept | — | **Implemented** |
| Test execution | ✓ retestScopeId, qaHandoffId on executions | ✓ Handoff execution POST + manual paths | ✓ Handoff detail execute UI | ✓ Assignment + handoff integration | **Implemented** |
| Defect lifecycle | ✓ Existing | ✓ Existing | ✓ Defect workspace | — | **Implemented** |
| Release readiness | ✓ Uses CI, defects, clarifications, changes | ✓ `evaluateReleaseReadiness` (CI/QA/defect gates) | ✓ Existing page (consumes enriched API) | — | **Implemented** |
| Agent attribution | ✓ `ActorType`, agent on changes | ✓ Agent tools for changes, scope, handoffs, CI | ✓ Pipeline attribution column | — | **Implemented** |
| GitHub integration config | ✓ Health fields on `GitHubProjectIntegration` | ✓ GET/PUT/rotate + webhook health | ✓ `/admin/github` settings | ✓ Signature + integration | **Implemented** |
| CI gate override | ✓ `CiGateOverride` | ✓ QA lead POST `/ci/overrides` | ✓ Delivery detail override dialog | ✓ Audit + agent denial tests | **Implemented** |
| Delivery timeline | ✓ `DeliveryTimelineEvent` | ✓ `recordDeliveryEvent` on key actions | ✓ Detail timeline | — | **Implemented** |
| Switch coordination | ✓ Rooms + heartbeat + outbound fields | ✓ Status + delivery notifications | ✓ Admin status + setup steps | Partial E2E | **Partial** (requires Switch credentials) |

## Externally blocked

- **Live Switch agent orchestration**: Requires Switch bridge credentials and runtime; local AgentQA APIs and runner scaffold remain usable without live Switch.
- **Production GitHub App**: Webhook endpoint is implemented; customers must configure repository webhooks and secrets per project.

## Verification commands

```bash
cd backend
DATABASE_URL=postgresql://agentqa:agentqa_dev@localhost:5433/agentqa npm run db:migrate
DATABASE_URL=postgresql://agentqa:agentqa_dev@localhost:5433/agentqa npm run db:seed
npm run test
npm run build
```

## Demo path (PAY project after seed)

1. Open **Delivery** — seeded change “Permission validation updated” with CI success, approved scope, pending handoff.
2. Open **QA Inbox** — accept handoff as QA engineer.
3. Use **Release Readiness** — CI/QA/defect gates with blockers and warnings.
