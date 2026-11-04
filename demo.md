# Demo scenarios

Use seeded project **Payments Platform** (`PAY`).

## 1 — Multiple QA engineers

1. Login as `qa.b@agentqa.demo` and `qa.c@agentqa.demo` in two browsers.
2. Open **My Workspace** → claim the same recommended test from both sessions quickly.
3. Observe one success and one `409` conflict; **Team Board** shows single ownership.

## 2 — Urgent developer change

1. Login as `dev.a@agentqa.demo` — view **Developer Changes** (seeded SUBMITTED change).
2. Login as `lead@agentqa.demo` — approve change.
3. Dashboard priorities refresh; Switch notify fires if bridge env configured.

## 3 — Design decision misunderstanding

1. Open **TC-110** detail — see approved **DD-014**.
2. QA agent MCP: `get_design_decisions` with `testCaseExternalId=TC-110`.

## 4 — Forgotten critical coverage

1. Register QA Coordination agent + API key.
2. Call `coordination_scan` MCP tool or `POST /api/projects/:id/coordination/scan`.
3. QA lead receives in-app notification for unassigned **TC-105**.

## 5 — Cross-agent coordination

1. Register two QA agents with different API keys.
2. Agent A claims via MCP; Agent B reads queue — case no longer available.

## 6 — Automated testing

1. Agent calls `run_automated_test` for `TC-105` with cycle case + build ids from queue payload.
2. Execution evidence stored; dashboard updates over WebSocket.

## 7 — Defect lifecycle

1. View seeded defect **DEF-0001**.
2. Developer updates status via API/UI patch to `READY_FOR_QA`.
3. QA verifies and sets `VERIFIED` → `CLOSED`.
