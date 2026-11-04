# API overview

Base URL: `http://localhost:4000`

## Auth

- `POST /api/auth/login` — `{ email, password }`
- `GET /api/auth/me` — Bearer JWT
- `POST /api/auth/register` — optional signup

## Projects

- `GET /api/projects`
- `GET /api/projects/:projectId/dashboard`
- `GET /api/projects/:projectId/test-cases?q=`
- `GET /api/projects/:projectId/test-cases/:testCaseId`
- `GET /api/projects/:projectId/my-workspace`
- `GET /api/projects/:projectId/team-board`
- `GET /api/projects/:projectId/release-readiness`

## Assignments & execution

- `POST /api/assignments/:assignmentId/claim`
- `POST /api/assignments/:assignmentId/release`
- `POST /api/executions/manual`
- `POST /api/executions/automated`

## Intelligence & workflow

- `POST /api/projects/:projectId/cycles/:cycleId/refresh-priorities`
- `GET /api/projects/:projectId/cycles/:cycleId/queue`
- `GET/POST /api/projects/:projectId/developer-changes`
- `POST /api/projects/:projectId/developer-changes/:id/approve`
- `GET /api/projects/:projectId/design-decisions`
- `GET/POST /api/projects/:projectId/defects`
- `GET/POST /api/projects/:projectId/knowledge`
- `POST /api/projects/:projectId/coordination/scan`

## Agents

- `GET/POST /api/projects/:projectId/agents`
- Agent tools (Bearer `aq_...`):
  - `GET /api/agent-tools/test-queue`
  - `GET /api/agent-tools/design-decisions`
  - `POST /api/agent-tools/claim`

## Realtime

- WebSocket `ws://localhost:4000/ws?token=<jwt>`
- Send `{ "type": "subscribe", "projectId": "..." }`
