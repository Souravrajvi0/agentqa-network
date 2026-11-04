import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { EmptyState, MetricCard, MonoId, PageHeader, SectionTitle, StatusBadge } from "../components/ui";

export function DashboardPage() {
  const { projectId = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", projectId],
    queryFn: () => api<any>(`/api/projects/${projectId}/dashboard`),
  });

  const stats = data?.stats ?? {};
  const total = stats.total || 1;
  const progressPct = Math.round(((stats.completed ?? 0) / total) * 100);

  return (
    <div>
      <PageHeader
        title="Overview Dashboard"
        greetUser
        subtitle={data?.activeCycle ? data.activeCycle.name : "No active cycle"}
        actions={
          data?.activeCycle ? (
            <Link to={`/projects/${projectId}/my-workspace`} className="btn-primary">
              Open workspace
            </Link>
          ) : null
        }
      />

      {isLoading ? <p className="text-label">Loading telemetry…</p> : null}

      <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Testing progress" value={`${progressPct}%`} hint={`${stats.completed ?? 0} / ${stats.total ?? 0} completed`} tone="success" />
        <MetricCard label="Critical queue" value={data?.criticalQueue?.length ?? 0} hint="P0/P1 recommended next" tone="critical" />
        <MetricCard label="Active claims" value={stats.inProgress ?? 0} hint={`${stats.unassigned ?? 0} still unassigned`} tone="agent" />
        <MetricCard label="Failed runs" value={stats.failedExecutions ?? 0} hint={`${stats.blocked ?? 0} blocked assignments`} tone="warning" />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="card lg:col-span-3">
          <SectionTitle>Priority recommendations</SectionTitle>
          <ul className="space-y-3">
            {(data?.criticalQueue ?? []).map((item: any) => (
              <li key={item.cycleCaseId} className="list-row">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <MonoId>{item.testCase.externalId}</MonoId>
                    <p className="mt-1 text-sm text-heading">{item.testCase.title}</p>
                  </div>
                  <StatusBadge value={item.recommendation?.recommended ?? item.testCase.priority} />
                </div>
              </li>
            ))}
            {!data?.criticalQueue?.length && !isLoading ? (
              <EmptyState title="No prioritized items" description="Refresh priorities from QA lead tools." />
            ) : null}
          </ul>
        </section>

        <section className="card lg:col-span-2 space-y-6">
          <div>
            <SectionTitle>Agent activity</SectionTitle>
            <ul className="space-y-2 text-xs text-label">
              {(data?.agentActivity ?? []).map((a: any) => (
                <li key={a.id} className="flex gap-2 border-l-2 pl-2" style={{ borderColor: "var(--border-strong)" }}>
                  <span className="font-medium text-heading">{a.agent.displayName}</span>
                  <span className="text-body-theme">{a.action}</span>
                </li>
              ))}
              {!data?.agentActivity?.length ? <li className="text-muted">No recent agent events</li> : null}
            </ul>
          </div>
          <div>
            <SectionTitle>Developer changes</SectionTitle>
            <ul className="space-y-2 text-sm">
              {(data?.recentChanges ?? []).map((c: any) => (
                <li key={c.id} className="list-row py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-heading">{c.title}</p>
                    <StatusBadge value={c.urgency} />
                  </div>
                  <p className="text-xs text-muted">{c.author?.name}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
