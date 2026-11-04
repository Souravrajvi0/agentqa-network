#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = (process.env.AGENTQA_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const API_KEY = process.env.AGENTQA_AGENT_API_KEY ?? "";

async function agentFetch(path: string, init?: RequestInit) {
  if (!API_KEY) {
    throw new Error("AGENTQA_AGENT_API_KEY is required");
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${await res.text()}`);
  }
  return res.json();
}

const server = new McpServer({ name: "agentqa-network", version: "1.1.0" });

server.tool("get_project_context", "Project summary, health, and agent identity", {}, async () => {
  const data = await agentFetch("/api/agent-tools/project-context");
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool(
  "get_test_queue",
  "Retrieve prioritized testing queue for the agent's project",
  {},
  async () => {
    const data = await agentFetch("/api/agent-tools/test-queue");
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "list_test_cases",
  "List test cases in the agent project (optional search q)",
  { q: z.string().optional() },
  async ({ q }) => {
    const suffix = q ? `?q=${encodeURIComponent(q)}` : "";
    const data = await agentFetch(`/api/agent-tools/test-cases${suffix}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "claim_test",
  "Claim a test assignment atomically",
  { assignmentId: z.string().describe("Test assignment id") },
  async ({ assignmentId }) => {
    const data = await agentFetch("/api/agent-tools/claim", {
      method: "POST",
      body: JSON.stringify({ assignmentId }),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "get_design_decisions",
  "Retrieve approved design decisions optionally filtered by test case external id",
  { testCaseExternalId: z.string().optional() },
  async ({ testCaseExternalId }) => {
    const q = testCaseExternalId ? `?testCaseExternalId=${encodeURIComponent(testCaseExternalId)}` : "";
    const data = await agentFetch(`/api/agent-tools/design-decisions${q}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "record_manual_result",
  "Record a manual test execution result",
  {
    cycleCaseId: z.string(),
    buildId: z.string(),
    status: z.enum(["PASSED", "FAILED", "BLOCKED", "NOT_RUN"]),
    notes: z.string().optional(),
  },
  async (body) => {
    const data = await agentFetch("/api/executions/manual", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "run_automated_test",
  "Run an approved Playwright automation mapped to a test case",
  {
    testCaseExternalId: z.string(),
    cycleCaseId: z.string(),
    buildId: z.string(),
  },
  async (body) => {
    const data = await agentFetch("/api/executions/automated", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "list_defects",
  "List defects in the agent project",
  {},
  async () => {
    const data = await agentFetch("/api/agent-tools/defects");
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "create_defect",
  "Create a defect linked to optional test case",
  {
    summary: z.string(),
    description: z.string().optional(),
    testCaseId: z.string().optional(),
    priority: z.enum(["P0", "P1", "P2", "P3"]).optional(),
  },
  async (body) => {
    const data = await agentFetch("/api/agent-tools/defects", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "get_release_readiness",
  "Release readiness with current-build evidence checks",
  {},
  async () => {
    const data = await agentFetch("/api/agent-tools/release-readiness");
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "get_ci_status",
  "Retrieve CI runs for the agent project (optional changeId filter)",
  { changeId: z.string().optional() },
  async ({ changeId }) => {
    const q = changeId ? `?changeId=${encodeURIComponent(changeId)}` : "";
    const data = await agentFetch(`/api/agent-tools/ci-status${q}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "get_qa_handoffs",
  "Retrieve QA handoffs for approved retest work",
  { status: z.string().optional() },
  async ({ status }) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const data = await agentFetch(`/api/agent-tools/qa-handoffs${q}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "create_developer_change",
  "Create a developer change (development agents only)",
  {
    title: z.string(),
    description: z.string(),
    branch: z.string().optional(),
    repository: z.string().optional(),
    commitSha: z.string().optional(),
    impactedTestIds: z.array(z.string()).optional(),
    submit: z.boolean().optional(),
  },
  async (body) => {
    const data = await agentFetch("/api/agent-tools/developer-changes", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "propose_retest_scope",
  "Propose retest scope for human QA lead approval",
  {
    changeId: z.string(),
    testCaseIds: z.array(z.string()),
    description: z.string().optional(),
  },
  async (body) => {
    const data = await agentFetch("/api/agent-tools/retest-scope/propose", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "QA coordination scan for unassigned critical tests",
  {},
  async () => {
    const queue = await agentFetch("/api/agent-tools/test-queue");
    const projectId = queue.projectId as string;
    const data = await agentFetch(`/api/projects/${projectId}/coordination/scan`, {
      method: "POST",
      body: "{}",
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
