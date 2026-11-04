# Switch integration

Official docs: https://docs.switchagents.ai/switch-rooms/getting-started

## Verified mechanisms used

1. **Agent bridge HTTP** — `Authorization: Bearer <agent api key>`  
   - Post room message: `POST {bridge}/agents/{agentId}/message` with `{ room_id, content }`  
   - Documented in [The agent protocol](https://docs.switchagents.ai/switch-rooms/internals/agent-protocol.md)

2. **Agent WebSocket** — `{bridge}/agents/{agentId}/connection/ws` with connection id and room claims  
   - Used by `packages/switch-agent-runner` to react to addressed messages

3. **MCP tools for coding agents** — `packages/agent-mcp` exposes AgentQA operations (queue, claim, design decisions, automation)

## Setup checklist

1. Run Switch Console and create/connect a server ([quickstart](https://docs.switchagents.ai/switch-rooms/getting-started/index.md)).
2. Create a Mattermost (or Slack) room for the QA team.
3. Register Switch agents for Developer, QA, and QA Coordination personas ([onboard agents](https://docs.switchagents.ai/switch-rooms/getting-started/onboard-your-agents.md)).
4. Register matching agents in AgentQA (Agents view) and save the returned `aq_` API key.
5. Configure `.env` bridge URL and notify agent credentials for backend Switch posts.
6. Add MCP server to your coding agent:

```json
{
  "mcpServers": {
    "agentqa": {
      "command": "node",
      "args": ["packages/agent-mcp/dist/index.js"],
      "env": {
        "AGENTQA_API_URL": "http://localhost:4000",
        "AGENTQA_AGENT_API_KEY": "aq_..."
      }
    }
  }
}
```

7. Optional: run Switch bridge listener:

```bash
SWITCH_BRIDGE_BASE_URL=... SWITCH_AGENT_ID=... SWITCH_AGENT_API_KEY=... \
AGENTQA_AGENT_API_KEY=aq_... npm run start -w @agentqa/switch-agent-runner
```

## Unverified in this environment

Live cross-agent Switch demo requires your Switch server, registration keys, and messaging account linking. Without those credentials, AgentQA still runs end-to-end locally; Switch posts are skipped with a debug log.
