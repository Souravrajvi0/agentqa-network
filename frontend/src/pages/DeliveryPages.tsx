import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { EmptyState, ErrorText, PageHeader, StatusBadge } from "../components/ui";
import { useProjectRole } from "../hooks/useProjectRole";
import { canOverrideCiGate } from "../lib/roles";
import { useAuthStore } from "../stores/auth";

type PipelineRow = {
  change: {
    id: string;
    title: string;
    status: string;
    description?: string;
    createdByType: string;
    author: { name: string };
    authorAgent?: { displayName: string } | null;
  };
  latestCi?: { id: string; status: string; conclusion: string | null; workflowName: string } | null;
  ciGateBlocked: boolean;
  ciOverride?: { reason: string; actor?: { name: string } | null } | null;
  approvedScope?: { version: number; status: string } | null;
  handoff?: { id: string; status: string } | null;
  defectCount: number;
  qaProgress: number;
  releaseReady: boolean;
};

const detailTabs = [
  "Overview",
  "Development",
  "Design",
  "CI & builds",
  "Retest scope",
  "QA handoff",
  "Defects",
  "Timeline",
  "Readiness",
] as const;

export function DeliveryPipelinePage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [blockedOnly, setBlockedOnly] = useState(false);
  const queryKey = ["delivery-pipeline", projectId, q, blockedOnly];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (blockedOnly) params.set("blocked", "true");
      const qs = params.toString();
      return api<{ rows: PipelineRow[]; total: number }>(
        `/api/projects/${projectId}/delivery-pipeline${qs ? `?${qs}` : ""}`,
      );
    },
  });

  return (
    <div>
      <PageHeader
        title="Delivery"
        subtitle="Development → design → CI → build → retest scope → QA → release"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className="btn-secondary text-[12px]" to={`/projects/${projectId}/qa-inbox`}>
              QA Inbox
            </Link>
            <Link className="btn-secondary text-[12px]" to={`/projects/${projectId}/admin/github`}>
              GitHub
            </Link>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="input max-w-md flex-1 text-[13px]"
          placeholder="Search changes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="flex items-center gap-2 text-[12px] text-faint">
          <input type="checkbox" checked={blockedOnly} onChange={(e) => setBlockedOnly(e.target.checked)} />
          Blocked only
        </label>
      </div>
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
                        {row.ciOverride ? (
                          <span className="text-[10px] text-amber-700 dark:text-amber-300">QA overridden</span>
                        ) : row.ciGateBlocked ? (
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
                    {row.qaProgress > 0 ? <span className="ml-2 text-faint">{row.qaProgress}%</span> : null}
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
  const { role } = useProjectRole(projectId);
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof detailTabs)[number]>("Overview");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["delivery-detail", projectId, changeId],
    queryFn: () => api<any>(`/api/projects/${projectId}/delivery-pipeline/${changeId}`),
  });

  const { data: readiness } = useQuery({
    queryKey: ["release-readiness", projectId],
    queryFn: () => api<any>(`/api/projects/${projectId}/release-readiness`),
    enabled: tab === "Readiness",
  });

  const overrideCi = useMutation({
    mutationFn: () =>
      api(`/api/projects/${projectId}/ci/overrides`, {
        method: "POST",
        body: JSON.stringify({
          ciRunId: data.latestCi.id,
          developerChangeId: changeId,
          buildId: data.change.buildId,
          reason: overrideReason,
        }),
      }),
    onSuccess: () => {
      setError(null);
      setOverrideOpen(false);
      setOverrideReason("");
      void refetch();
      qc.invalidateQueries({ queryKey: ["delivery-pipeline", projectId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const showOverride = useMemo(() => {
    if (!data || !canOverrideCiGate(role)) return false;
    return data.ciGateBlocked && data.latestCi && !data.ciOverride;
  }, [data, role]);

  if (isLoading) return <p className="text-faint text-[13px]">Loading…</p>;
  if (!data) return <EmptyState title="Change not found" />;

  const isDemo = String(data.change.title).includes("[DEMO]");
  const latestHandoff = data.handoffs?.[0];

  return (
    <div className="space-y-6">
      {isDemo ? (
        <div className="rounded-sm border border-amber-500/30 bg-amber-50 px-3 py-2 text-[12px] text-amber-950 dark:border-amber-500/25 dark:bg-amber-950/30 dark:text-amber-100">
          Demo seeded workflow — CI rows marked <strong>DEMO_SEED</strong> are not from GitHub.
        </div>
      ) : null}
      <PageHeader
        title={data.change.title}
        subtitle={data.change.description}
        actions={
          <Link className="btn-secondary text-[12px]" to={`/projects/${projectId}/delivery`}>
            Back to pipeline
          </Link>
        }
      />
      <ErrorText message={error} />

      <div className="flex flex-wrap gap-1 border-b border-zinc-200/80 pb-2 dark:border-white/10">
        {detailTabs.map((t) => (
          <button
            key={t}
            type="button"
            className={`rounded-sm px-2 py-1 text-[12px] ${tab === t ? "bg-zinc-200/80 dark:bg-white/10" : "text-faint hover:text-heading"}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-faint">Change</h3>
            <StatusBadge value={data.change.status} />
            <p className="text-[13px] text-faint">QA progress: {data.qaProgress}%</p>
          </div>
          <div className="card space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-faint">CI gate</h3>
            {data.latestCi ? (
              <>
                <div className="flex flex-wrap gap-1">
                  <StatusBadge value={data.latestCi.status} />
                  {data.latestCi.conclusion ? <StatusBadge value={data.latestCi.conclusion} /> : null}
                </div>
                {data.ciOverride ? (
                  <p className="text-[12px] text-amber-800 dark:text-amber-200">
                    CI: {data.latestCi.conclusion ?? "FAILED"} · QA gate overridden by{" "}
                    {data.ciOverride.actor?.name ?? "QA Lead"}
                  </p>
                ) : data.ciGateBlocked ? (
                  <p className="text-[12px] text-rose-700 dark:text-rose-300">
                    QA blocked until CI passes or a QA Lead records an override.
                  </p>
                ) : null}
                {showOverride ? (
                  <button type="button" className="btn-secondary text-[12px]" onClick={() => setOverrideOpen(true)}>
                    Override CI gate…
                  </button>
                ) : null}
              </>
            ) : (
              <p className="text-faint text-[13px]">No CI runs linked</p>
            )}
          </div>
          <div className="card space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-faint">Handoff</h3>
            {latestHandoff ? (
              <>
                <StatusBadge value={latestHandoff.status} />
                <Link className="text-[12px] text-accent" to={`/projects/${projectId}/qa-inbox/${latestHandoff.id}`}>
                  Open handoff execution →
                </Link>
              </>
            ) : (
              <p className="text-faint text-[13px]">No handoff yet</p>
            )}
          </div>
        </div>
      ) : null}

      {tab === "Development" ? (
        <div className="card space-y-2 text-[13px]">
          <p>
            <span className="text-faint">Branch:</span> {data.change.branch ?? "—"}
          </p>
          <p>
            <span className="text-faint">Commit:</span>{" "}
            <span className="mono-id">{data.change.commitSha ?? "—"}</span>
          </p>
          <p>
            <span className="text-faint">Repository:</span> {data.change.repository ?? "—"}
          </p>
          <Link className="text-accent" to={`/projects/${projectId}/developer-changes`}>
            Developer Changes center
          </Link>
        </div>
      ) : null}

      {tab === "Design" ? (
        <div className="card">
          {!data.designs?.length ? (
            <p className="text-faint text-[13px]">No linked design decisions.</p>
          ) : (
            <ul className="space-y-2 text-[13px]">
              {data.designs.map((d: any) => (
                <li key={d.id}>
                  <span className="font-medium">{d.title}</span> — <StatusBadge value={d.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "CI & builds" ? (
        <div className="card space-y-3">
          <ul className="space-y-2 text-[13px]">
            {(data.ciHistory ?? []).map((run: any) => (
              <li key={run.id} className="flex flex-wrap items-center gap-2">
                <span>{run.workflowName}</span>
                <StatusBadge value={run.status} />
                {run.conclusion ? <StatusBadge value={run.conclusion} /> : null}
                <span className="text-faint">{run.provider}</span>
              </li>
            ))}
          </ul>
          {data.change.build ? (
            <p className="text-[13px]">
              Linked build: <strong>{data.change.build.label}</strong>
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "Retest scope" ? (
        <div className="card space-y-2 text-[13px]">
          {(data.scopes ?? []).map((s: any) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 border-b border-zinc-100 py-2 dark:border-white/5">
              <span>
                v{s.version} — {s.testCaseIds?.length ?? 0} tests
              </span>
              <StatusBadge value={s.status} />
            </div>
          ))}
        </div>
      ) : null}

      {tab === "QA handoff" ? (
        <div className="card space-y-3 text-[13px]">
          {(data.handoffs ?? []).map((h: any) => (
            <div key={h.id} className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <StatusBadge value={h.status} />
                <p className="text-faint">{h.summary}</p>
              </div>
              <Link className="btn-secondary text-[12px]" to={`/projects/${projectId}/qa-inbox/${h.id}`}>
                Execute
              </Link>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "Defects" ? (
        <div className="card">
          <p className="text-[13px]">{data.defectCount} defects linked to feature scope.</p>
          <Link className="text-accent text-[13px]" to={`/projects/${projectId}/defects`}>
            Open defect workspace
          </Link>
        </div>
      ) : null}

      {tab === "Timeline" ? (
        <div className="card">
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
      ) : null}

      {tab === "Readiness" ? (
        <div className="card space-y-2 text-[13px]">
          <p>
            Overall: <StatusBadge value={readiness?.overall ?? "NOT_READY"} />
          </p>
          <p>{readiness?.ciGate?.summary}</p>
          <ul className="list-disc pl-5 text-faint">
            {(readiness?.blockers ?? []).map((b: string) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <ul className="list-disc pl-5 text-amber-800 dark:text-amber-200">
            {(readiness?.warnings ?? []).map((w: string) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {overrideOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card max-w-lg space-y-3">
            <h3 className="font-medium text-heading">Override CI gate</h3>
            <p className="text-[13px] text-faint">
              CI run <strong>{data.latestCi?.workflowName}</strong> remains{" "}
              <StatusBadge value={data.latestCi?.conclusion ?? "FAILURE"} />. This records an explicit QA exception.
            </p>
            <textarea
              className="input min-h-[80px] w-full"
              placeholder="Reason for override (required)"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setOverrideOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={overrideReason.trim().length < 3 || overrideCi.isPending}
                onClick={() => overrideCi.mutate()}
              >
                Confirm override
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function QaInboxPage() {
  const { projectId = "" } = useParams();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<string>("all");
  const { data, refetch } = useQuery({
    queryKey: ["qa-inbox", projectId, filter],
    queryFn: () => {
      if (filter === "all" || filter === "mine") {
        return api<{ handoffs: any[] }>(`/api/projects/${projectId}/qa-inbox`);
      }
      return api<{ handoffs: any[] }>(`/api/projects/${projectId}/qa-inbox?status=${filter}`);
    },
  });

  async function acceptHandoff(handoffId: string) {
    try {
      await api(`/api/projects/${projectId}/qa-inbox/${handoffId}/accept`, { method: "POST", body: "{}" });
      void refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Accept failed");
    }
  }

  const filtered = (data?.handoffs ?? []).filter((h) => {
    if (filter === "mine") return h.assignedToUserId === user?.id;
    return true;
  });

  return (
    <div>
      <PageHeader title="QA Inbox" subtitle="Handoffs with approved retest scope and CI context" />
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["all", "All active"],
          ["PENDING", "Awaiting acceptance"],
          ["mine", "Assigned to me"],
          ["IN_PROGRESS", "In progress"],
          ["BLOCKED", "Blocked"],
          ["COMPLETED", "Completed"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`btn-secondary text-[11px] ${filter === value ? "ring-1 ring-zinc-400" : ""}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {!filtered.length ? (
        <EmptyState title="Inbox clear" description="No handoffs match this filter." />
      ) : (
        <div className="space-y-3">
          {filtered.map((h) => (
            <div key={h.id} className="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-heading">{h.developerChange?.title}</p>
                <p className="text-[13px] text-faint">{h.summary}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge value={h.status} />
                  {h.ciRun?.conclusion ? <StatusBadge value={h.ciRun.conclusion} /> : null}
                  {h.status === "BLOCKED" || (h.ciRun?.conclusion === "FAILURE" && h.status === "PENDING") ? (
                    <span className="text-[11px] text-rose-600">CI may block QA until override</span>
                  ) : null}
                </div>
                <p className="mt-1 text-[12px] text-faint">
                  Tests: {h.retestScope?.testCaseIds?.length ?? 0} approved
                  {h.assignedToUser ? ` · ${h.assignedToUser.name}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link className="btn-secondary text-[12px]" to={`/projects/${projectId}/qa-inbox/${h.id}`}>
                  Open
                </Link>
                {h.status === "PENDING" ? (
                  <button type="button" className="btn-primary text-[12px]" onClick={() => acceptHandoff(h.id)}>
                    Accept
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
