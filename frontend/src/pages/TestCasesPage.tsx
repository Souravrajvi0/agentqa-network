import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader, StatusBadge } from "../components/ui";

export function TestCasesPage() {
  const { projectId = "" } = useParams();
  const [q, setQ] = useState("");
  const query = useMemo(() => (q ? `?q=${encodeURIComponent(q)}` : ""), [q]);
  const { data } = useQuery({
    queryKey: ["test-cases", projectId, q],
    queryFn: () => api<{ testCases: any[] }>(`/api/projects/${projectId}/test-cases${query}`),
  });

  return (
    <div>
      <PageHeader title="Test Case Explorer" subtitle="Search, filter, and inspect linked design context" />
      <input className="input mb-4 max-w-md" placeholder="Search by id or title" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-left text-slate-400">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Automation</th>
            </tr>
          </thead>
          <tbody>
            {(data?.testCases ?? []).map((tc) => (
              <tr key={tc.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                <td className="px-3 py-2">
                  <Link className="text-brand-500 hover:underline" to={`/projects/${projectId}/test-cases/${tc.id}`}>
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
  const { data } = useQuery({
    queryKey: ["test-case", testCaseId],
    queryFn: () => api<{ testCase: any }>(`/api/projects/${projectId}/test-cases/${testCaseId}`),
  });
  const tc = data?.testCase;

  return (
    <div>
      <PageHeader title={tc?.externalId ?? "Test case"} subtitle={tc?.title} />
      {tc ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card space-y-2 text-sm">
            <p>
              Priority: <StatusBadge value={tc.priority} />
            </p>
            <p className="text-slate-300">{tc.description}</p>
            <pre className="overflow-auto rounded bg-slate-950 p-3 text-xs">{JSON.stringify(tc.steps, null, 2)}</pre>
          </section>
          <section className="card">
            <h3 className="mb-2 font-medium">Design decisions</h3>
            <ul className="space-y-2 text-sm">
              {(tc.designLinks ?? []).map((d: any) => (
                <li key={d.designDecision.id}>
                  <p className="font-medium">{d.designDecision.externalId}</p>
                  <p className="text-slate-400">{d.designDecision.title}</p>
                </li>
              ))}
            </ul>
            <h3 className="mb-2 mt-4 font-medium">Knowledge</h3>
            <ul className="space-y-2 text-sm text-slate-300">
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
