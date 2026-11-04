import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { ErrorText, PageHeader, StatusBadge } from "../components/ui";
import { useProjectRole } from "../hooks/useProjectRole";
import { canEditTestCases } from "../lib/roles";

export function TestCasesPage() {
  const { projectId = "" } = useParams();
  const { role } = useProjectRole(projectId);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    externalId: "",
    title: "",
    priority: "P2",
    description: "",
  });
  const query = useMemo(() => (q ? `?q=${encodeURIComponent(q)}` : ""), [q]);
  const { data } = useQuery({
    queryKey: ["test-cases", projectId, q],
    queryFn: () => api<{ testCases: any[] }>(`/api/projects/${projectId}/test-cases${query}`),
  });

  const createCase = useMutation({
    mutationFn: () =>
      api(`/api/projects/${projectId}/test-cases`, {
        method: "POST",
        body: JSON.stringify({
          externalId: form.externalId,
          title: form.title,
          description: form.description || undefined,
          priority: form.priority,
          steps: [{ step: 1, action: "Execute scenario", expected: "Matches expected results" }],
        }),
      }),
    onSuccess: () => {
      setError(null);
      setShowForm(false);
      setForm({ externalId: "", title: "", priority: "P2", description: "" });
      qc.invalidateQueries({ queryKey: ["test-cases", projectId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div>
      <PageHeader title="Test Case Explorer" subtitle="Search, create, and inspect linked design context" />
      <ErrorText message={error} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input max-w-md flex-1" placeholder="Search by id or title" value={q} onChange={(e) => setQ(e.target.value)} />
        {canEditTestCases(role) ? (
          <button type="button" className="btn-secondary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "New test case"}
          </button>
        ) : null}
      </div>
      {showForm ? (
        <section className="card mb-4 grid gap-2 sm:grid-cols-2">
          <input className="input" placeholder="External ID" value={form.externalId} onChange={(e) => setForm({ ...form, externalId: e.target.value })} />
          <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {["P0", "P1", "P2", "P3"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input className="input sm:col-span-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="input sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button className="btn-primary sm:col-span-2 sm:w-fit" disabled={!form.externalId || !form.title} onClick={() => createCase.mutate()}>
            Save test case
          </button>
        </section>
      ) : null}
      <div className="table-shell">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Automation</th>
            </tr>
          </thead>
          <tbody>
            {(data?.testCases ?? []).map((tc) => (
              <tr key={tc.id}>
                <td className="px-3 py-2">
                  <Link className="link-accent" to={`/projects/${projectId}/test-cases/${tc.id}`}>
                    {tc.externalId}
                  </Link>
                </td>
                <td className="px-3 py-2">{tc.title}</td>
                <td className="px-3 py-2">
                  <StatusBadge value={tc.priority} />
                </td>
                <td className="px-3 py-2">{tc.automationAvailable ? "Yes" : "Manual"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TestCaseDetailPage() {
  const { projectId = "", testCaseId = "" } = useParams();
  const { role } = useProjectRole(projectId);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", priority: "P2" });

  const { data, refetch } = useQuery({
    queryKey: ["test-case", testCaseId],
    queryFn: () => api<{ testCase: any }>(`/api/projects/${projectId}/test-cases/${testCaseId}`),
  });
  const tc = data?.testCase;

  useEffect(() => {
    if (tc && !editing) {
      setForm({ title: tc.title, description: tc.description ?? "", priority: tc.priority });
    }
  }, [tc, editing]);

  const save = useMutation({
    mutationFn: () =>
      api(`/api/projects/${projectId}/test-cases/${testCaseId}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      setEditing(false);
      setError(null);
      refetch();
      qc.invalidateQueries({ queryKey: ["test-cases", projectId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const archive = useMutation({
    mutationFn: () =>
      api(`/api/projects/${projectId}/test-cases/${testCaseId}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: true }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-cases", projectId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div>
      <PageHeader title={tc?.externalId ?? "Test case"} subtitle={tc?.title} />
      <ErrorText message={error} />
      {canEditTestCases(role) && tc ? (
        <div className="mb-4 flex gap-2">
          <button className="btn-secondary" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel edit" : "Edit"}
          </button>
          {!tc.archived ? (
            <button className="btn-ghost" onClick={() => archive.mutate()}>
              Archive
            </button>
          ) : null}
        </div>
      ) : null}
      {editing ? (
        <section className="card mb-4 grid gap-2">
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {["P0", "P1", "P2", "P3"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button className="btn-primary w-fit" onClick={() => save.mutate()}>
            Save revision
          </button>
        </section>
      ) : null}
      {tc ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card space-y-2 text-sm">
            <p>
              Priority: <StatusBadge value={tc.priority} />
            </p>
            <p className="text-body-theme">{tc.description}</p>
            <pre className="surface-inset overflow-auto p-3 text-xs">{JSON.stringify(tc.steps, null, 2)}</pre>
          </section>
          <section className="card">
            <h3 className="mb-2 font-medium">Design decisions</h3>
            <ul className="space-y-2 text-sm">
              {(tc.designLinks ?? []).map((d: any) => (
                <li key={d.designDecision.id}>
                  <p className="font-medium">{d.designDecision.externalId}</p>
                  <p className="text-muted">{d.designDecision.title}</p>
                </li>
              ))}
            </ul>
            <h3 className="mb-2 mt-4 font-medium">Knowledge</h3>
            <ul className="space-y-2 text-sm text-body-theme">
              {(tc.knowledge ?? []).map((k: any) => (
                <li key={k.id}>
                  <p className="font-medium">{k.title}</p>
                  <p>{k.content}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
