# Architecture

## Modular monolith

Single deployable backend with clear modules:

- **Auth** — JWT users + `aq_` agent API keys (hashed)
- **Domain** — Prisma models for QA entities
- **Intelligence** — deterministic prioritization scorer
- **Realtime** — WebSocket hub scoped by project subscription
- **Automation** — allowlisted Playwright commands only
- **Switch** — outbound messages via [agent protocol](https://docs.switchagents.ai/switch-rooms/internals/agent-protocol.md) `POST /agents/{id}/message`

## Data authority

PostgreSQL is the source of truth for structured testing state. Switch carries collaboration messages; agents pull/push state through AgentQA APIs.

## Frontend

React SPA calls REST and subscribes to `/ws` after login.

## Agent integration path

```
Switch room mention → switch-agent-runner → AgentQA REST
Coding agent (Codex/Claude) → agent-mcp (stdio) → AgentQA REST
```

## Security

- Role checks on every project route
- Agent keys scoped to owner + project registration
- No arbitrary shell from public APIs (automation map only)
