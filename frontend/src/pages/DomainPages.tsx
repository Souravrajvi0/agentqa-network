import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { ErrorText, PageHeader, StatusBadge } from "../components/ui";
import { invalidateProjectQueries, useTestingContext } from "../hooks/useTestingContext";
import { useProjectRole } from "../hooks/useProjectRole";
import { roleCanWriteDefects } from "../components/RequireProjectRole";
import { canRegisterAgents } from "../lib/roles";

export function DesignDecisionsPage() {
  const { projectId = "" } = useParams();
  const qc = useQueryClient();
  const [question, setQuestion] = useState("");
  const [decisionId, setDecisionId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["design", projectId],
    queryFn: () => api<{ decisions: any[] }>(`/api/projects/${projectId}/design-decisions`),
  });

  const clarify = useMutation({
    mutationFn: () =>
      api(`/api/projects/${projectId}/design-decisions/${decisionId}/clarifications`, {
        method: "POST",
        body: JSON.stringify({ question }),
      }),
    onSuccess: () => {
      setQuestion("");
      setError(null);
      invalidateProjectQueries(qc, projectId);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div>
      <PageHeader title="Design Decision Center" subtitle="Approved behavior references and clarification requests" />
      <ErrorText message={error} />
      <section className="card mb-4 space-y-2">
        <h2 className="font-medium">Request clarification</h2>
        <select className="input" value={decisionId} onChange={(e) => setDecisionId(e.target.value)}>
          <option value="">Select decision</option>
          {(data?.decisions ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.externalId} — {d.title}
            </option>
          ))}
        </select>
        <textarea className="input min-h-[80px]" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question for developer / QA lead" />
        <button className="btn-primary" disabled={!decisionId || !question || clarify.isPending} onClick={() => clarify.mutate()}>
          Submit clarification
        </button>
      </section>
      <div className="space-y-3">
        {(data?.decisions ?? []).map((d) => (
          <article key={d.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">
                {d.externalId} · {d.title}
              </h2>
              <StatusBadge value={d.status} />
            </div>
            <p className="mt-2 text-sm text-body-theme">{d.description}</p>
            <p className="mt-2 text-sm">
              <span className="text-label">Expected:</span> {d.expectedBehavior}
            </p>
            {(d.clarifications ?? []).length ? (
              <ul className="mt-3 space-y-1 text-xs text-label">
                {d.clarifications.map((c: any) => (
                  <li key={c.id}>
                    Q: {c.question} ({c.status})
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

export function DeveloperChangesPage() {
  const { projectId = "" } = useParams();
  const { role } = useProjectRole(projectId);
  const qc = useQueryClient();
  const ctx = useTestingContext(projectId);
  const [error, setError] = useState<string | null>(null);
  const [editImpact, setEditImpact] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState({
    title: "",
    description: "",
    urgency: "P1",
    impactedTestIds: [] as string[],
  });

  const { data, refetch } = useQuery({
    queryKey: ["dev-changes", projectId],
    queryFn: () => api<{ changes: any[] }>(`/api/projects/${projectId}/developer-changes`),
  });

  const submitChange = useMutation({
    mutationFn: (submit: boolean) =>
      api(`/api/projects/${projectId}/developer-changes`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          releaseId: ctx.data?.activeCycle?.releaseId,
          buildId: ctx.data?.currentBuild?.id,
          submit,
        }),
      }),
    onSuccess: () => {
      setForm({ title: "", description: "", urgency: "P1", impactedTestIds: [] });
      setError(null);
      invalidateProjectQueries(qc, projectId);
      refetch();
    },
    onError: (e: Error) => setError(e.message),
  });

  async function transition(id: string, status: string, impactedTestIds?: string[]) {
    try {
      await api(`/api/projects/${projectId}/developer-changes/${id}/transition`, {
        method: "POST",
        body: JSON.stringify({ status, impactedTestIds }),
      });
      invalidateProjectQueries(qc, projectId);
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  }

  const isDev = role === "DEVELOPER" || role === "ADMINISTRATOR";
  const isLead = role === "QA_LEAD" || role === "ADMINISTRATOR";

  return (
    <div>
      <PageHeader
        title="Developer Change Center"
        subtitle="Draft → submit → QA review → retest → verified (explicit test impact)"
      />
      <ErrorText message={error} />
      {isDev ? (
        <section className="card mb-4 space-y-2">
          <h2 className="font-medium">Register a change</h2>
          <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="input min-h-[90px]" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className="input" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
            {["P0", "P1", "P2", "P3"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <p className="text-xs text-label">Explicit impacted tests (no automatic impact analysis)</p>
          <div className="max-h-32 overflow-auto rounded border p-2 text-xs" style={{ borderColor: "var(--divider)" }}>
            {(ctx.data?.testCases ?? []).map((tc) => (
              <label key={tc.id} className="flex gap-2 py-1">
                <input
                  type="checkbox"
                  checked={form.impactedTestIds.includes(tc.id)}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      impactedTestIds: e.target.checked
                        ? [...f.impactedTestIds, tc.id]
                        : f.impactedTestIds.filter((id) => id !== tc.id),
                    }));
                  }}
                />
                {tc.externalId} — {tc.title}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => submitChange.mutate(false)}>
              Save draft
            </button>
            <button className="btn-primary" onClick={() => submitChange.mutate(true)}>
              Submit to QA
            </button>
          </div>
        </section>
      ) : null}
      <div className="space-y-3">
        {(data?.changes ?? []).map((c) => {
          const impactIds = editImpact[c.id] ?? c.impactedTestIds ?? [];
          return (
            <article key={c.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-medium">{c.title}</h2>
                <div className="flex gap-2">
                  <StatusBadge value={c.urgency} />
                  <StatusBadge value={c.status} />
                </div>
              </div>
              <p className="mt-2 text-sm text-body-theme">{c.description}</p>
              {c.build?.label ? (
                <p className="mt-1 text-xs text-muted">Build: {c.build.label}</p>
              ) : null}
              <div className="mt-3">
                <p className="text-xs font-medium text-label">Impacted tests</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {(c.impactedTests ?? []).map((t: any) => (
                    <li key={t.id}>
                      {t.externalId} — {t.title}
                    </li>
                  ))}
                  {!c.impactedTests?.length ? <li className="text-muted">None linked</li> : null}
                </ul>
              </div>
              {isLead && c.status === "SUBMITTED" ? (
                <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "var(--divider)" }}>
                  <p className="text-xs text-label">Adjust retest scope before approval</p>
                  <div className="max-h-28 overflow-auto text-xs">
                    {(ctx.data?.testCases ?? []).map((tc) => (
                      <label key={tc.id} className="flex gap-2 py-1">
                        <input
                          type="checkbox"
                          checked={impactIds.includes(tc.id)}
                          onChange={(e) => {
                            setEditImpact((prev) => ({
                              ...prev,
                              [c.id]: e.target.checked
                                ? [...impactIds, tc.id]
                                : impactIds.filter((id) => id !== tc.id),
                            }));
                          }}
                        />
                        {tc.externalId}
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-primary" onClick={() => transition(c.id, "APPROVED", impactIds)}>
                      Approve retest scope
                    </button>
                    <button className="btn-ghost" onClick={() => transition(c.id, "REJECTED")}>
                      Reject
                    </button>
                  </div>
                </div>
              ) : null}
              {isLead && c.status === "APPROVED" ? (
                <button className="btn-secondary mt-3" onClick={() => transition(c.id, "COMPLETED")}>
                  Mark verified after retest
                </button>
              ) : null}
              {isDev && c.status === "DRAFT" ? (
                <button className="btn-primary mt-3" onClick={() => transition(c.id, "SUBMITTED")}>
                  Submit draft
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function DefectsPage() {
  const { projectId = "" } = useParams();
  const { role } = useProjectRole(projectId);
  const qc = useQueryClient();
  const ctx = useTestingContext(projectId);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    summary: "",
    description: "",
    testCaseId: "",
    actualBehavior: "",
    expectedBehavior: "",
    priority: "P2",
  });

  const { data } = useQuery({
    queryKey: ["defects", projectId],
    queryFn: () => api<{ defects: any[] }>(`/api/projects/${projectId}/defects`),
  });

  const createDefect = useMutation({
    mutationFn: () =>
      api(`/api/projects/${projectId}/defects`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          testCaseId: form.testCaseId || undefined,
        }),
      }),
    onSuccess: () => {
      setForm({ summary: "", description: "", testCaseId: "", actualBehavior: "", expectedBehavior: "", priority: "P2" });
      setError(null);
      invalidateProjectQueries(qc, projectId);
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/projects/${projectId}/defects/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => invalidateProjectQueries(qc, projectId),
  });

  return (
    <div>
      <PageHeader title="Defect Workspace" subtitle="Report, triage, and verify defects" />
      <ErrorText message={error} />
      {roleCanWriteDefects(role) ? (
      <section className="card mb-4 space-y-2">
        <h2 className="font-medium">Report defect</h2>
        <input className="input" placeholder="Summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        <textarea className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <select className="input" value={form.testCaseId} onChange={(e) => setForm({ ...form, testCaseId: e.target.value })}>
          <option value="">Related test (optional)</option>
          {(ctx.data?.testCases ?? []).map((tc) => (
            <option key={tc.id} value={tc.id}>
              {tc.externalId}
            </option>
          ))}
        </select>
        <button className="btn-primary" disabled={!form.summary || createDefect.isPending} onClick={() => createDefect.mutate()}>
          Create defect
        </button>
      </section>
      ) : (
        <p className="mb-4 text-sm text-label">View-only: your role can browse defects but not create them.</p>
      )}
      <div className="space-y-2">
        {(data?.defects ?? []).map((d) => (
          <div key={d.id} className="card text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {d.externalId} · {d.summary}
                </p>
                <p className="text-label">{d.testCase?.externalId}</p>
              </div>
              <StatusBadge value={d.status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {role !== "VIEWER"
                ? ["TRIAGED", "IN_PROGRESS", "READY_FOR_QA", "VERIFIED", "CLOSED", "REOPENED"].map((status) => (
                <button key={status} className="btn-ghost" onClick={() => updateStatus.mutate({ id: d.id, status })}>
                  {status}
                </button>
              ))
                : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AgentsPage() {
  const { projectId = "" } = useParams();
  const { role } = useProjectRole(projectId);
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "qa.agent.b",
    displayName: "QA Agent B",
    agentType: "QA",
    switchAgentId: "",
    switchRoomId: "",
  });

  const { data, refetch } = useQuery({
    queryKey: ["agents", projectId],
    queryFn: () => api<any>(`/api/projects/${projectId}/agents`),
  });

  const register = useMutation({
    mutationFn: () =>
      api(`/api/projects/${projectId}/agents`, {
        method: "POST",
        body: JSON.stringify({ ...form, capabilities: {} }),
      }),
    onSuccess: (res: any) => {
      setCreatedKey(res.apiKey);
      setError(null);
      invalidateProjectQueries(qc, projectId);
      refetch();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Agent Collaboration"
        subtitle="Register your own AgentQA agent · MCP API key · optional Switch identity"
      />
      <ErrorText message={error} />
      {!canRegisterAgents(role) ? (
        <p className="mb-4 text-sm text-label">
          View-only for your project role. QA engineers, developers, and leads can register agents.
        </p>
      ) : null}
      {createdKey ? (
        <div className="card mb-4 border border-amber-500/30 text-sm dark:border-amber-500/25">
          <p className="font-medium text-warning">Agent API key (copy now — shown once)</p>
          <code className="surface-inset mt-2 block break-all p-2 text-xs text-heading">{createdKey}</code>
          <p className="mt-2 text-xs text-label">Set AGENTQA_AGENT_API_KEY for MCP and switch-agent-runner.</p>
        </div>
      ) : null}
      {canRegisterAgents(role) ? (
      <section className="card mb-4 grid gap-2 md:grid-cols-2">
        <input className="input" placeholder="name (lowercase)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" placeholder="Display name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        <select className="input" value={form.agentType} onChange={(e) => setForm({ ...form, agentType: e.target.value })}>
          <option value="QA">QA</option>
          <option value="DEVELOPMENT">DEVELOPMENT</option>
          <option value="QA_COORDINATION">QA_COORDINATION</option>
        </select>
        <input className="input" placeholder="Switch agent id (optional)" value={form.switchAgentId} onChange={(e) => setForm({ ...form, switchAgentId: e.target.value })} />
        <button className="btn-primary md:col-span-2" onClick={() => register.mutate()}>
          Register AgentQA agent
        </button>
      </section>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-2 font-medium">Registered agents</h2>
          <ul className="space-y-2 text-sm">
            {(data?.agents ?? []).map((a: any) => (
              <li key={a.id} className="rounded border border-white/[0.08] p-2">
                <p className="font-medium">{a.displayName}</p>
                <p className="text-xs text-label">{a.agentType}</p>
                <p className="text-xs text-muted">Switch: {a.switchAgentId ?? "—"}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="mb-2 font-medium">Switch rooms</h2>
          <ul className="space-y-2 text-sm text-body-theme">
            {(data?.rooms ?? []).map((r: any) => (
              <li key={r.id}>
                {r.roomName} ({r.roomId})
              </li>
            ))}
            {!data?.rooms?.length ? <li>No room links — add one in Admin.</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}

export function ReleaseReadinessPage() {
  const { projectId = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["readiness", projectId],
    queryFn: () => api<any>(`/api/projects/${projectId}/release-readiness`),
  });

  return (
    <div>
      <PageHeader title="Release Readiness" subtitle="Coverage and blockers with explicit human approval disclaimer" />
      {isLoading ? <p className="text-label">Calculating readiness…</p> : null}
      <div className="card">
        <p className="text-lg font-medium">{data?.ready ? "Suggested ready" : "Not ready"}</p>
        <ul className="mt-3 list-disc pl-5 text-sm text-body-theme">
          {(data?.blockers ?? []).map((b: string) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        {(data?.incompleteCritical ?? []).length ? (
          <p className="mt-3 text-sm text-warning">
            Critical assignments incomplete: {(data.incompleteCritical as string[]).join(", ")}
          </p>
        ) : null}
        {(data?.staleOnCurrentBuild ?? []).length ? (
          <p className="mt-3 text-sm text-warning">
            Stale on current build: {(data.staleOnCurrentBuild as string[]).join(", ")}
          </p>
        ) : null}
        {data?.currentBuild ? (
          <p className="mt-2 text-xs text-label">Current build: {data.currentBuild.label}</p>
        ) : null}
        <p className="mt-4 text-xs text-muted">{data?.disclaimer}</p>
      </div>
    </div>
  );
}

export function ExecutionPage() {
  const { projectId = "" } = useParams();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["execution-center", projectId],
    queryFn: () => api<any>(`/api/projects/${projectId}/execution-center`),
  });

  const runAuto = useMutation({
    mutationFn: (payload: { testCaseExternalId: string; cycleCaseId: string; buildId: string }) =>
      api("/api/executions/automated", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      setError(null);
      invalidateProjectQueries(qc, projectId);
    },
    onError: (e: Error) => setError(e.message),
  });

  const buildId = data?.currentBuild?.id;

  return (
    <div>
      <PageHeader title="Test Execution Center" subtitle="Run approved Playwright automation and inspect evidence" />
      <ErrorText message={error} />
      {isLoading ? <p className="text-label">Loading automation catalog…</p> : null}
      <ul className="space-y-3">
        {(data?.automatedCases ?? []).map((row: any) => {
          const last = row.executions?.[0];
          return (
            <li key={row.id} className="card text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{row.testCase.externalId}</p>
                  <p className="text-label">{row.testCase.title}</p>
                  <p className="mt-1 text-xs text-muted">Command: {row.testCase.automationCommand}</p>
                </div>
                {last ? <StatusBadge value={last.status} /> : <StatusBadge value="NOT_RUN" />}
              </div>
              {buildId ? (
                <button
                  className="btn-primary mt-3"
                  disabled={runAuto.isPending}
                  onClick={() =>
                    runAuto.mutate({
                      testCaseExternalId: row.testCase.externalId,
                      cycleCaseId: row.id,
                      buildId,
                    })
                  }
                >
                  Run automation
                </button>
              ) : null}
              {last?.evidence?.[0]?.content ? (
                <pre className="surface-inset mt-2 max-h-24 overflow-auto p-2 text-xs text-label">
                  {String(last.evidence[0].content).slice(0, 400)}
                </pre>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
