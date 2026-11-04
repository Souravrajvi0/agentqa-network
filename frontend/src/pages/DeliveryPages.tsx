import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { EmptyState, PageHeader, StatusBadge } from "../components/ui";

type PipelineRow = {
  change: {
    id: string;
    title: string;
    status: string;
    createdByType: string;
    author: { name: string };
    authorAgent?: { displayName: string } | null;
  };
  latestCi?: { status: string; conclusion: string | null; workflowName: string } | null;
  ciGateBlocked: boolean;
  approvedScope?: { version: number; status: string } | null;
  handoff?: { status: string } | null;
  defectCount: number;
  qaProgress: number;
  releaseReady: boolean;
};

export function DeliveryPipelinePage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["delivery-pipeline", projectId],
    queryFn: () => api<{ rows: PipelineRow[]; total: number }>(`/api/projects/${projectId}/delivery-pipeline`),
  });

  return (
    <div>
      <PageHeader
        title="Delivery"
        subtitle="Development → design → CI → build → retest scope → QA → release"
        actions={
          <Link className="btn-secondary text-[12px]" to={`/projects/${projectId}/qa-inbox`}>
            QA Inbox
          </Link>
        }
      />
      {isLoading ? (
        <p className="text-faint text-[13px]">Loading pipeline…</p>
      ) : !data?.rows.length ? (
        <EmptyState title="No developer changes" description="Register a change to start the delivery workflow." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[960px] text-left text-[12px]">
            <thead className="border-b border-zinc-200/80 text-[10px] uppercase tracking-wider text-faint dark:border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium">Change</th>
                <th className="px-4 py-3 font-medium">Dev</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">CI</th>
                <th className="px-4 py-3 font-medium">Scope</th>
                <th className="px-4 py-3 font-medium">QA</th>
                <th className="px-4 py-3 font-medium">Defects</th>
                <th className="px-4 py-3 font-medium">Ready</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr
                  key={row.change.id}
                  className="cursor-pointer border-b border-zinc-100 hover:bg-zinc-50/80 dark:border-white/[0.04] dark:hover:bg-white/[0.02]"
                  onClick={() => navigate(`/projects/${projectId}/delivery/${row.change.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-heading">{row.change.title}</td>
                  <td className="px-4 py-3 text-faint">
                    {row.change.createdByType === "AGENT"
                      ? row.change.authorAgent?.displayName ?? "Agent"
                      : row.change.author.name}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={row.change.status} />
                  </td>
                  <td className="px-4 py-3">
                    {row.latestCi ? (
                      <span className="flex flex-wrap items-center gap-1">
                        <StatusBadge value={row.latestCi.status} />
                        {row.latestCi.conclusion ? <StatusBadge value={row.latestCi.conclusion} /> : null}
                        {row.ciGateBlocked ? (
                          <span className="text-[10px] text-rose-600 dark:text-rose-300">blocked</span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.approvedScope ? (
                      <StatusBadge value={row.approvedScope.status} />
                    ) : (
                      <span className="text-faint">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.handoff ? <StatusBadge value={row.handoff.status} /> : <span className="text-faint">—</span>}
                    {row.qaProgress > 0 ? (
                      <span className="ml-2 text-faint">{row.qaProgress}%</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{row.defectCount}</td>
                  <td className="px-4 py-3">{row.releaseReady ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function DeliveryDetailPage() {
  const { projectId = "", changeId = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["delivery-detail", projectId, changeId],
    queryFn: () => api<any>(`/api/projects/${projectId}/delivery-pipeline/${changeId}`),
  });

  if (isLoading) return <p className="text-faint text-[13px]">Loading…</p>;
  if (!data) return <EmptyState title="Change not found" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.change.title}
        subtitle={data.change.description}
        actions={
          <Link className="btn-secondary text-[12px]" to={`/projects/${projectId}/delivery`}>
            Back to pipeline
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-faint">Overview</h3>
          <StatusBadge value={data.change.status} />
          <p className="text-[13px] text-faint">QA progress: {data.qaProgress}%</p>
        </div>
        <div className="card space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-faint">CI</h3>
          {data.latestCi ? (
            <>
              <p className="text-[13px]">{data.latestCi.workflowName}</p>
              <StatusBadge value={data.latestCi.status} />
              {data.latestCi.conclusion ? <StatusBadge value={data.latestCi.conclusion} /> : null}
            </>
          ) : (
            <p className="text-faint text-[13px]">No CI runs linked</p>
          )}
        </div>
        <div className="card space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-faint">Retest scope</h3>
          {data.approvedScope ? (
            <p className="text-[13px]">v{data.approvedScope.version} — {data.approvedScope.testCaseIds?.length ?? 0} tests</p>
          ) : (
            <p className="text-faint text-[13px]">Not approved yet</p>
          )}
        </div>
      </div>
      {data.designs?.length ? (
        <div className="card">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-faint">Design context</h3>
          <ul className="space-y-2 text-[13px]">
            {data.designs.map((d: any) => (
              <li key={d.id}>
                <span className="font-medium">{d.title}</span> — <StatusBadge value={d.status} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="card">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-faint">Timeline</h3>
        <ol className="space-y-3 border-l border-zinc-200 pl-4 dark:border-white/10">
          {(data.timeline ?? []).map((ev: any) => (
            <li key={ev.id} className="relative text-[13px]">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500" />
              <p className="font-medium text-heading">{ev.title}</p>
              <p className="text-faint text-[11px]">{new Date(ev.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function QaInboxPage() {
  const { projectId = "" } = useParams();
  const { data, refetch } = useQuery({
    queryKey: ["qa-inbox", projectId],
    queryFn: () => api<{ handoffs: any[] }>(`/api/projects/${projectId}/qa-inbox`),
  });

  async function acceptHandoff(handoffId: string) {
    await api(`/api/projects/${projectId}/qa-inbox/${handoffId}/accept`, { method: "POST", body: "{}" });
    void refetch();
  }

  return (
    <div>
      <PageHeader title="QA Inbox" subtitle="Handoffs with approved retest scope and CI context" />
      {!data?.handoffs.length ? (
        <EmptyState title="Inbox clear" description="No handoffs awaiting QA attention." />
      ) : (
        <div className="space-y-3">
          {data.handoffs.map((h) => (
            <div key={h.id} className="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-heading">{h.developerChange?.title}</p>
                <p className="text-[13px] text-faint">{h.summary}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge value={h.status} />
                  {h.ciRun?.conclusion ? <StatusBadge value={h.ciRun.conclusion} /> : null}
                  {h.build?.label ? (
                    <span className="text-[11px] text-faint">Build: {h.build.label}</span>
                  ) : null}
                </div>
                <p className="mt-1 text-[12px] text-faint">
                  Tests: {h.retestScope?.testCaseIds?.length ?? 0} approved
                </p>
              </div>
              {h.status === "PENDING" ? (
                <button type="button" className="btn-primary shrink-0" onClick={() => acceptHandoff(h.id)}>
                  Accept
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
