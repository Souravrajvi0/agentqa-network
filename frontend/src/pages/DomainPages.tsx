import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader, StatusBadge } from "../components/ui";

export function DesignDecisionsPage() {
  const { projectId = "" } = useParams();
  const { data } = useQuery({
    queryKey: ["design", projectId],
    queryFn: () => api<{ decisions: any[] }>(`/api/projects/${projectId}/design-decisions`),
  });

  return (
    <div>
      <PageHeader title="Design Decision Center" subtitle="Approved behavior references for QA investigations" />
      <div className="space-y-3">
        {(data?.decisions ?? []).map((d) => (
          <article key={d.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">
                {d.externalId} · {d.title}
              </h2>
              <StatusBadge value={d.status} />
            </div>
            <p className="mt-2 text-sm text-slate-300">{d.description}</p>
            <p className="mt-2 text-sm">
              <span className="text-slate-400">Expected:</span> {d.expectedBehavior}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Author {d.author?.name}
              {d.approver ? ` · Approved by ${d.approver.name}` : ""}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function DeveloperChangesPage() {
  const { projectId = "" } = useParams();
  const { data, refetch } = useQuery({
    queryKey: ["dev-changes", projectId],
    queryFn: () => api<{ changes: any[] }>(`/api/projects/${projectId}/developer-changes`),
  });

  async function approve(id: string) {
    await api(`/api/projects/${projectId}/developer-changes/${id}/approve`, { method: "POST" });
    refetch();
  }

  return (
    <div>
      <PageHeader title="Developer Change Center" subtitle="Urgent testing requests and impacted coverage" />
      <div className="space-y-3">
        {(data?.changes ?? []).map((c) => (
          <article key={c.id} className="card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">{c.title}</h2>
              <StatusBadge value={c.urgency} />
            </div>
            <p className="mt-2 text-sm text-slate-300">{c.description}</p>
            <p className="mt-1 text-xs text-slate-500">Status: {c.status}</p>
            {c.status === "SUBMITTED" ? (
              <button className="btn-primary mt-3" onClick={() => approve(c.id)}>
                QA Lead approve & refresh queue
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

export function DefectsPage() {
  const { projectId = "" } = useParams();
  const { data } = useQuery({
    queryKey: ["defects", projectId],
    queryFn: () => api<{ defects: any[] }>(`/api/projects/${projectId}/defects`),
  });

  return (
    <div>
      <PageHeader title="Defect Workspace" subtitle="Lifecycle tracking connected to test evidence" />
      <div className="space-y-2">
        {(data?.defects ?? []).map((d) => (
          <div key={d.id} className="card flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              <p className="font-medium">
                {d.externalId} · {d.summary}
              </p>
              <p className="text-slate-400">{d.testCase?.externalId}</p>
            </div>
            <StatusBadge value={d.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AgentsPage() {
  const { projectId = "" } = useParams();
  const { data } = useQuery({
    queryKey: ["agents", projectId],
    queryFn: () => api<any>(`/api/projects/${projectId}/agents`),
  });

  return (
    <div>
      <PageHeader
        title="Agent Collaboration View"
        subtitle="Switch-connected identities, rooms, and recent activity"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-2 font-medium">Registered agents</h2>
          <ul className="space-y-2 text-sm">
            {(data?.agents ?? []).map((a: any) => (
              <li key={a.id} className="rounded border border-slate-800 p-2">
                <p className="font-medium">{a.displayName}</p>
                <p className="text-xs text-slate-400">{a.agentType}</p>
                <p className="text-xs text-slate-500">Switch agent id: {a.switchAgentId ?? "configure in admin"}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="mb-2 font-medium">Switch rooms</h2>
          <ul className="space-y-2 text-sm text-slate-300">
            {(data?.rooms ?? []).map((r: any) => (
              <li key={r.id}>
                {r.roomName} ({r.roomId})
              </li>
            ))}
            {!data?.rooms?.length ? <li>No room links configured — see switch-integration.md</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}

export function ReleaseReadinessPage() {
  const { projectId = "" } = useParams();
  const { data } = useQuery({
    queryKey: ["readiness", projectId],
    queryFn: () => api<any>(`/api/projects/${projectId}/release-readiness`),
  });

  return (
    <div>
      <PageHeader title="Release Readiness" subtitle="Coverage and blockers with explicit human approval disclaimer" />
      <div className="card">
        <p className="text-lg font-medium">{data?.ready ? "Suggested ready" : "Not ready"}</p>
        <ul className="mt-3 list-disc pl-5 text-sm text-slate-300">
          {(data?.blockers ?? []).map((b: string) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-500">{data?.disclaimer}</p>
      </div>
    </div>
  );
}

export function ExecutionPage() {
  const { projectId = "" } = useParams();
  const { data } = useQuery({
    queryKey: ["test-cases", projectId],
    queryFn: () => api<{ testCases: any[] }>(`/api/projects/${projectId}/test-cases`),
  });

  const automated = (data?.testCases ?? []).filter((t) => t.automationAvailable);

  return (
    <div>
      <PageHeader title="Test Execution Center" subtitle="Approved automation mappings executed via Playwright" />
      <ul className="space-y-2">
        {automated.map((tc) => (
          <li key={tc.id} className="card text-sm">
            <p className="font-medium">{tc.externalId}</p>
            <p className="text-slate-400">{tc.title}</p>
            <p className="mt-1 text-xs text-slate-500">Command key: {tc.automationCommand}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-slate-400">Agents trigger runs through the AgentQA MCP `run_automated_test` tool.</p>
    </div>
  );
}
