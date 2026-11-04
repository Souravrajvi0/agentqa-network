# AgentQA Network — Implementation Matrix

Audit date: 2026-11-04 (mandate branch `feat/full-product-mandate-2ff4`).

Legend: **Complete** = implemented and wired end-to-end in this branch unless noted. **Partial** = schema or UI exists but gaps remain. **Backend only** / **Frontend only** as labeled.

| Feature | Database | Backend | Frontend | Tests | Status |
|---|---|---|---|---|---|
| Projects | Complete (`Project`) | Complete — list with `myRole` + health, create, get, patch, members CRUD | Complete — listing, create, header switcher | Partial — integration test added | **Partial → Complete (P0 APIs/UI)** |
| Project membership | Complete (`ProjectMember`) | Complete — add/update/remove with RBAC | Complete — Admin member UI | Partial | **Complete (core CRUD)** |
| Role permissions | Complete (`ProjectRole`) | Complete — `requireProjectRole` on routes | Complete — `useProjectRole`, nav filtering, landing redirect | Partial | **Partial → Complete (nav)** |
| Test management | Complete | Complete — list/get/create/patch + version snapshot | Partial — create UI; no edit/archive UI yet | Missing | **Partial** |
| Developer workflows | Complete | Partial — changes CRUD, approve; limited lifecycle | Wired screens | Missing | **Partial** |
| Defects | Complete | Partial — create/update | Wired | Missing | **Partial** |
| Builds and evidence | Complete | Partial — executions per `buildId`; readiness uses current build | Partial — stale UX limited | Partial (readiness logic) | **Partial** |
| Release readiness | N/A | Improved — current build + stale P0/P1 checks | Display on page | None | **Partial** |
| Agents and MCP | Complete | Partial — agents + MCP package | Agents page | Minimal | **Partial** |
| Switch integration | Complete (`SwitchRoomLink`) | Scaffold — outbound notify | Admin link form | None | **Blocked / scaffold** |
| Notifications | Complete | Partial — create + list | Bell UI | None | **Partial** |

## P0 delivered in this iteration

- Project APIs: POST/PATCH, members, enriched GET `/projects` with health summary.
- Lead assignment: POST `/assignments/:id/assign`.
- Test case POST/PATCH (with revision snapshot).
- Release readiness considers **current build** executions for P0/P1 scope.
- Frontend: persistent **project switcher**, **role-aware sidebar**, **role landing** (`ProjectHomeRedirect`).
- Seed: **PAY**, **ECOM**, **IDP** + `viewer@agentqa.demo` + cross-project role for `qa.b@agentqa.demo`.

## Remaining (next iterations)

- Test case edit/archive UI, bulk import, lead assignment UI on team board.
- Full developer change lifecycle (UNDER_REVIEW, QA_IN_PROGRESS, VERIFIED) and impact approval UX.
- MCP tool audit pass, Switch live integration when credentials available.
- Global entity search (not navigation-only ⌘K).
- Frontend tests; expanded auth/RBAC integration suite.
- Audit trail UI.

## Demo scenarios

| Scenario | Supported |
|---|---|
| A — Multi-project role experience | Yes — switcher + different `myRole` per project |
| B — Developer-to-QA workflow | Partial — seeded links; not full lifecycle UI |
| C — QA execution + evidence | Yes — manual execution with build id |
| D — Agent MCP | Partial — package exists; verify each tool |
| E — Switch | Scaffold only |
