# AgentQA Network — Implementation Matrix

Last updated: delivery completion pass on `feat/delivery-completion-3be4`.

| Feature | Database | Backend | Frontend | Tests | Status |
|---|---|---|---|---|---|
| Projects | ✓ | ✓ CRUD, health, members | ✓ list, create, switcher | Integration (gated) | **Complete** |
| Project membership | ✓ | ✓ RBAC enforced | ✓ Admin UI | Integration (gated) | **Complete** |
| Role permissions | ✓ | ✓ `requireProjectRole` | ✓ nav, guards, landing | Unit transitions | **Complete** |
| Test management | ✓ | ✓ list/create/patch/archive + versions | ✓ create, edit, archive | Partial | **Complete (core)** |
| Developer workflows | ✓ | ✓ transitions, impact, build link | ✓ full change center | Unit transitions | **Complete (core)** |
| Defects | ✓ | ✓ CRUD + status | ✓ report + triage | — | **Complete (core)** |
| Builds and evidence | ✓ | ✓ executions per build | ✓ execution + workspace | Readiness logic | **Complete (core)** |
| Release readiness | — | ✓ build + stale P0/P1 | ✓ blockers UI | Agent tool | **Complete (core)** |
| Agents and MCP | ✓ | ✓ agent-tools REST | ✓ register UI | Manual | **Complete (core)** |
| Switch integration | ✓ rooms + heartbeat | Outbound + status API + event notify | Admin status + GitHub link | E2E partial | **Partial (no live creds)** |
| Notifications | ✓ | ✓ create/list/read | ✓ bell | — | **Partial** |
| Global search | — | ✓ `/search` | ✓ ⌘K entities | — | **Complete** |
| Audit trail | ✓ | ✓ write + list | ✓ Admin view | — | **Complete (core)** |

## Demo accounts (password `password123`)

| Email | PAY | ECOM | IDP |
|---|---|---|---|
| admin@agentqa.demo | Administrator | Administrator | Administrator |
| qa.b@agentqa.demo | QA Engineer | **QA Lead** | QA Engineer |
| lead@agentqa.demo | QA Lead | QA Lead | — |
| dev.a@agentqa.demo | Developer | Developer | Developer |
| viewer@agentqa.demo | Viewer | — | Viewer |

## End-to-end scenarios

| Scenario | Status |
|---|---|
| A Multi-project roles + switcher | Supported |
| B Developer → QA change workflow | Supported (explicit impact + approve + verify) |
| C QA claim/execute/evidence on build | Supported |
| D Agent MCP tools | Supported (see `packages/agent-mcp`) |
| E Switch live orchestration | Blocked without bridge credentials; status documented |

## Running integration tests

```bash
AGENTQA_INTEGRATION=1 DATABASE_URL=... npm run test -w backend
```

## Known limits (honest)

- Switch inbound agent runner remains scaffold until external bridge credentials are provided.
- Bulk test import not implemented.
- Frontend automated tests not yet added.
- `ChangeRequestStatus` uses `COMPLETED` for “verified” (no separate enum migration).
