# AgentQA Delivery Pipeline — Implementation Report

Branch: `feat/delivery-pipeline-2ff4`  
Report date: 2026-11-04 (IST)

## Repository audit (Phase 0)

Existing monorepo retained: Express API, Prisma/PostgreSQL, React shell, MCP agent tools, Switch status scaffold. Delivery mandate extended (not replaced) developer changes, design, cycles, defects, and release readiness.

## Database changes and migrations

| Migration | Purpose |
| --- | --- |
| `20261104113956_delivery_pipeline` | `CiRun`, `RetestScope`, `QAHandoff`, `CiGateOverride`, `DeliveryTimelineEvent`, `GitHubProjectIntegration`, change/build/execution extensions |
| `20261104120000_webhook_dedup` | `InboundWebhookDelivery` unique `(provider, deliveryId)` |

**Label:** IMPLEMENTED AND TESTED (migrations applied on local Postgres `:5433`).

## Backend APIs added or modified

| Area | Routes | Label |
| --- | --- | --- |
| Delivery pipeline | `GET /api/projects/:id/delivery-pipeline`, `GET .../:changeId` | IMPLEMENTED AND TESTED |
| QA inbox | `GET /api/projects/:id/qa-inbox`, `POST .../:handoffId/accept` | IMPLEMENTED BUT NOT FULLY TESTED (accept path manual) |
| Retest scope | `POST .../retest-scopes/propose`, `POST .../:scopeId/approve` | IMPLEMENTED AND TESTED (approve permissions) |
| CI | `POST .../ci/simulate`, `POST .../ci/overrides` | IMPLEMENTED AND TESTED (simulate + override audit) |
| GitHub config | `GET/PUT .../integrations/github` (secret never returned) | IMPLEMENTED BUT NOT FULLY TESTED (no admin UI) |
| Webhook | `POST /api/integrations/github/webhook` (raw body + HMAC) | IMPLEMENTED AND TESTED |
| Release readiness | Enhanced `GET .../release-readiness` | IMPLEMENTED AND TESTED |
| Agent tools | `qa-handoffs`, `ci-status`, `developer-changes`, `retest-scope/propose` | IMPLEMENTED BUT NOT FULLY TESTED |

## Frontend screens

| Screen | Label |
| --- | --- |
| Delivery pipeline list + detail (timeline, design, CI history, demo banner) | IMPLEMENTED AND TESTED (unit smoke) |
| QA Inbox | IMPLEMENTED BUT NOT FULLY TESTED |
| Release readiness (qaGate/warnings) | IMPLEMENTED AND TESTED |

## GitHub integration

- **Config:** Project `PUT` stores `owner`, `repo`, `webhookSecret`, `defaultBranch`. **Label:** IMPLEMENTED AND TESTED (API).
- **Webhook URL:** `https://<host>/api/integrations/github/webhook`
- **Events:** `workflow_run` (primary).
- **Security:** HMAC SHA-256, timing-safe compare, rate limit 120/min/IP, delivery dedup via `InboundWebhookDelivery`.
- **Simulation (no GitHub):** `POST /api/projects/:projectId/ci/simulate` with `metadata.simulated: true` — **not** treated as GitHub traffic.

### Webhook setup (customer)

1. Configure integration in AgentQA (`PUT .../integrations/github`).
2. In GitHub repo → Settings → Webhooks → Add payload URL above.
3. Secret = same as AgentQA `webhookSecret`.
4. Content type `application/json`, event **Workflow runs**.

## CI → build association rules

- Real GitHub webhooks: provider `GITHUB_ACTIONS`, upsert by `(projectId, provider, externalRunId)`.
- Successful completed run with `commitSha` creates/updates `Build` on active release (`gh-<runId>` label).
- **No downgrade:** completed CI is not reverted to `IN_PROGRESS`; lower `runNumber` metadata ignored.
- Seed/demo CI uses provider **`DEMO_SEED`** (explicitly not GitHub).

## Retest scope and QA handoff

- Proposed by developer (human JWT); approved by **human** QA Lead (`requireHumanUser`).
- Approved scope + passing CI (or override) creates `QAHandoff` and notifies QA.
- **Label:** IMPLEMENTED AND TESTED (integration + permissions).

## MCP tool changes

Added: `get_ci_status`, `get_qa_handoffs`, `create_developer_change`, `propose_retest_scope`.  
**Label:** IMPLEMENTED BUT NOT FULLY TESTED (MCP smoke manual).

## Switch integration

Status/rooms unchanged; live agent orchestration **BLOCKED BY EXTERNAL DEPENDENCY** (Switch bridge credentials/runtime).

## Security improvements

| Control | Label |
| --- | --- |
| Webhook HMAC + dedup | IMPLEMENTED AND TESTED |
| `requireHumanUser` for approvals/overrides/config | IMPLEMENTED AND TESTED |
| Self-approval blocked (non-admin author) | IMPLEMENTED AND TESTED |
| Agent keys cannot approve scopes | IMPLEMENTED AND TESTED |
| Project RBAC on all routes | IMPLEMENTED AND TESTED (sample cross-project) |
| Rate limits (auth + webhook) | IMPLEMENTED BUT NOT FULLY TESTED |
| Secrets omitted from GET integration | IMPLEMENTED AND TESTED |
| CI override audit + unchanged CI conclusion | IMPLEMENTED AND TESTED |
| Structured errors `{ error, code }` | IMPLEMENTED (AppError) |

## Test execution results

```bash
# Unit (default)
cd backend && npm run test
# 16 passed, integration skipped

# Full (Postgres required)
AGENTQA_INTEGRATION=1 DATABASE_URL=postgresql://agentqa:agentqa_dev@localhost:5433/agentqa npm run test -w @agentqa/backend
# 27 passed

cd frontend && npm run test   # 2 passed
cd frontend && npm run build  # OK
cd backend && npm run build   # OK
```

## Production build results

Backend `tsc` and frontend `vite build` succeed on this branch.

## Demo: Payments Platform — Payment Authorization Expiry

**Label:** IMPLEMENTED AND TESTED (seed + Delivery UI)

Seeded change: **`[DEMO] Payment Authorization Expiry`** on project **PAY**:

- Design **DD-PAY-AUTH-EXP** (approved).
- CI rows **`DEMO_SEED`** (not GitHub).
- Approved retest scope (10 tests: 5 auth + 5 payment).
- Completed handoff, failed execution on **build-2401**, retests on **build-2402-fix**, defect **DEF-DEMO-0001** verified.
- Timeline events prefixed `[DEMO]`.

### Local setup

```bash
docker compose up -d   # Postgres on host :5433
cd backend
DATABASE_URL=postgresql://agentqa:agentqa_dev@localhost:5433/agentqa npm run db:migrate
DATABASE_URL=postgresql://agentqa:agentqa_dev@localhost:5433/agentqa npm run db:seed
npm run dev            # :4000
cd ../frontend && npm run dev   # :5173, proxies /api
```

Login: `lead@agentqa.demo` / `password123` → PAY → **Delivery** → open demo change.

### Simulate CI locally (no GitHub)

```bash
curl -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"workflowName":"ci.yml","conclusion":"SUCCESS","commitSha":"local-test-sha"}' \
  http://localhost:4000/api/projects/$PROJECT_ID/ci/simulate
```

## Remaining gaps

| Item | Label |
| --- | --- |
| CI override + GitHub settings UI | PARTIALLY IMPLEMENTED |
| Handoff-scoped execution UI | PARTIALLY IMPLEMENTED |
| Full frontend E2E (Playwright delivery flows) | PARTIALLY IMPLEMENTED |
| Switch live coordination | BLOCKED BY EXTERNAL DEPENDENCY |
| Encrypt webhook secret at rest | NOT IMPLEMENTED (stored for HMAC verification; never logged/exposed) |

## External credentials required

- GitHub webhook secret (customer-managed).
- Switch bridge (optional).
- Production `JWT_SECRET`, `DATABASE_URL`, TLS termination for webhooks.

## Definition of done (§16) summary

Items 1–18 are **IMPLEMENTED AND TESTED** or **IMPLEMENTED BUT NOT FULLY TESTED** as labeled above; item 19 (historical evidence) **IMPLEMENTED AND TESTED** via seed + integration; item 20 (automated tests) **IMPLEMENTED AND TESTED** for backend integration suite when `AGENTQA_INTEGRATION=1`.

See also [`DELIVERY_GAP_MATRIX.md`](./DELIVERY_GAP_MATRIX.md).
