import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader, StatusBadge } from "../components/ui";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function DashboardPage() {
  const { projectId = "" } = useParams();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["dashboard", projectId],
    queryFn: () => api<any>(`/api/projects/${projectId}/dashboard`),
  });

  const refresh = useMutation({
    mutationFn: () =>
      api(`/api/projects/${projectId}/cycles/${data.activeCycle.id}/refresh-priorities`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard", projectId] }),
  });

  const stats = data?.stats ?? {};
  const chartData = [
    { name: "Unassigned", value: stats.unassigned ?? 0 },
    { name: "Active", value: stats.inProgress ?? 0 },
    { name: "Done", value: stats.completed ?? 0 },
    { name: "Blocked", value: stats.blocked ?? 0 },
  ];

  return (
    <div>
      <PageHeader
        title="Overview Dashboard"
        subtitle={data?.activeCycle ? `${data.activeCycle.name} · ${data.activeCycle.release?.version}` : "No active cycle"}
      />
      <div className="mb-4 flex gap-2">
        {data?.activeCycle ? (
          <button className="btn-primary" disabled={refresh.isPending} onClick={() => refresh.mutate()}>
            Refresh priorities
          </button>
        ) : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <p className="mb-3 text-sm text-slate-400">Testing progress</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card space-y-2">
          <p className="text-sm text-slate-400">Risk snapshot</p>
          <p>Failed runs: {stats.failedExecutions ?? 0}</p>
          <p>Total cases: {stats.total ?? 0}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-medium">Critical queue</h2>
          <ul className="space-y-2 text-sm">
            {(data?.criticalQueue ?? []).map((item: any) => (
              <li key={item.cycleCaseId} className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div>
                  <p className="font-medium">{item.testCase.externalId}</p>
                  <p className="text-slate-400">{item.testCase.title}</p>
                  {item.recommendation?.reasons ? (
                    <p className="mt-1 text-xs text-slate-500">{JSON.stringify(item.recommendation.reasons).slice(0, 120)}…</p>
                  ) : null}
                </div>
                <StatusBadge value={item.recommendation?.recommended ?? item.testCase.priority} />
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="mb-3 font-medium">Recent developer changes</h2>
          <ul className="space-y-2 text-sm">
            {(data?.recentChanges ?? []).map((c: any) => (
              <li key={c.id} className="border-b border-slate-800 pb-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{c.title}</p>
                  <StatusBadge value={c.urgency} />
                </div>
                <p className="text-slate-400">{c.author?.name}</p>
              </li>
            ))}
          </ul>
          <h3 className="mb-2 mt-4 font-medium">Agent activity</h3>
          <ul className="space-y-1 text-xs text-slate-400">
            {(data?.agentActivity ?? []).map((a: any) => (
              <li key={a.id}>
                {a.agent.displayName}: {a.action}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
