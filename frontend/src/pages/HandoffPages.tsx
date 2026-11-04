import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { api } from "../lib/api";
import { EmptyState, ErrorText, PageHeader, StatusBadge } from "../components/ui";
import { useAuthStore } from "../stores/auth";

export function HandoffDetailPage() {
  const { projectId = "", handoffId = "" } = useParams();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["handoff", projectId, handoffId],
    queryFn: () => api<any>(`/api/projects/${projectId}/qa-inbox/${handoffId}`),
    enabled: Boolean(projectId && handoffId),
  });

  const accept = useMutation({
    mutationFn: () => api(`/api/projects/${projectId}/qa-inbox/${handoffId}/accept`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      setError(null);
      void refetch();
      qc.invalidateQueries({ queryKey: ["qa-inbox", projectId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const execute = useMutation({
    mutationFn: (payload: { testCaseId: string; status: string; notes?: string }) =>
      api(`/api/projects/${projectId}/qa-inbox/${handoffId}/executions`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setError(null);
      void refetch();
    },
    onError: (e: Error) => setError(e.message),
  });

  const complete = useMutation({
    mutationFn: () => api(`/api/projects/${projectId}/qa-inbox/${handoffId}/complete`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      setError(null);
      void refetch();
      qc.invalidateQueries({ queryKey: ["delivery-pipeline", projectId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  if (isLoading) return <p className="text-faint text-[13px]">Loading handoff…</p>;
  if (!data?.handoff) return <EmptyState title="Handoff not found" />;

  const { handoff, progress, scopeTests, designs, timeline, defects, ciOverride, ciGateBlocked, scopeApprover } =
    data;
  const isAssignee = handoff.assignedToUserId === user?.id;
  const canExecute = isAssignee && ["ACCEPTED", "IN_PROGRESS"].includes(handoff.status);
  const change = handoff.developerChange;

  return (
    <div className="space-y-6">
      <PageHeader
        title={change.title}
        subtitle={handoff.summary ?? "QA handoff"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className="btn-secondary text-[12px]" to={`/projects/${projectId}/qa-inbox`}>
              QA Inbox
            </Link>
            <Link className="btn-secondary text-[12px]" to={`/projects/${projectId}/delivery/${change.id}`}>
              Delivery detail
            </Link>
          </div>
        }
      />
      <ErrorText message={error} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-faint">Handoff</h3>
          <StatusBadge value={handoff.status} />
          {handoff.assignedToUser ? (
            <p className="text-[13px]">Assigned: {handoff.assignedToUser.name}</p>
          ) : null}
          {handoff.status === "PENDING" ? (
            <button type="button" className="btn-primary" disabled={accept.isPending} onClick={() => accept.mutate()}>
              Accept handoff
            </button>
          ) : null}
        </div>
        <div className="card space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-faint">Build & CI</h3>
          {handoff.build ? <p className="text-[13px]">Build: {handoff.build.label}</p> : null}
          {change.branch ? <p className="text-[13px] text-faint">Branch: {change.branch}</p> : null}
          {change.commitSha ? <p className="mono-id text-[11px]">{change.commitSha}</p> : null}
          {handoff.ciRun ? (
            <div className="flex flex-wrap gap-1">
              <StatusBadge value={handoff.ciRun.status} />
              {handoff.ciRun.conclusion ? <StatusBadge value={handoff.ciRun.conclusion} /> : null}
            </div>
          ) : null}
          {ciOverride ? (
            <p className="text-[12px] text-amber-800 dark:text-amber-200">
              QA gate overridden by {ciOverride.actor?.name ?? "QA Lead"} — CI remains failed
            </p>
          ) : ciGateBlocked ? (
            <p className="text-[12px] text-rose-700 dark:text-rose-300">CI blocks QA until override or green CI</p>
          ) : null}
        </div>
        <div className="card space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-faint">Retest scope</h3>
          <p className="text-[13px]">
            v{handoff.retestScope.version} — {handoff.retestScope.testCaseIds?.length ?? 0} tests
          </p>
          {scopeApprover ? <p className="text-[12px] text-faint">Approved by {scopeApprover.name}</p> : null}
          <p className="text-[12px]">
            Progress: {progress.completed}/{progress.required} executed · {progress.passed} passed · {progress.failed}{" "}
            failed · {progress.blocked} blocked · {progress.remaining} remaining
          </p>
        </div>
      </div>

      {designs?.length ? (
        <div className="card">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Design decisions</h3>
          <ul className="space-y-2 text-[13px]">
            {designs.map((d: any) => (
              <li key={d.id}>
                {d.title} — <StatusBadge value={d.status} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-faint">Execute approved tests</h3>
        {!canExecute ? (
          <p className="text-[13px] text-faint">Accept this handoff to execute tests in the approved retest scope.</p>
        ) : (
          <div className="space-y-4">
            {scopeTests.map((row: any) => (
              <div key={row.testCase.id} className="rounded-sm border border-zinc-200/80 p-3 dark:border-white/10">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-heading">{row.testCase.title}</p>
                    <p className="text-[12px] text-faint">{row.testCase.externalId}</p>
                    {row.latestExecution ? (
                      <StatusBadge value={row.latestExecution.status} />
                    ) : (
                      <span className="text-[12px] text-faint">Not executed on this build</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(["PASSED", "FAILED", "BLOCKED"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        className="btn-secondary text-[11px]"
                        disabled={!row.cycleCaseId || execute.isPending}
                        onClick={() =>
                          execute.mutate({
                            testCaseId: row.testCase.id,
                            status,
                            notes: notes[row.testCase.id],
                          })
                        }
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                {!row.cycleCaseId ? (
                  <p className="mt-2 text-[12px] text-rose-600">Not in active cycle — contact QA lead.</p>
                ) : null}
                <textarea
                  className="input mt-2 min-h-[60px] w-full text-[12px]"
                  placeholder="Execution notes"
                  value={notes[row.testCase.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [row.testCase.id]: e.target.value })}
                />
              </div>
            ))}
            {progress.remaining === 0 ? (
              <button type="button" className="btn-primary" disabled={complete.isPending} onClick={() => complete.mutate()}>
                Complete handoff
              </button>
            ) : (
              <p className="text-[13px] text-faint">{progress.remaining} tests still need results on the current build.</p>
            )}
          </div>
        )}
      </div>

      {defects?.length ? (
        <div className="card">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Related defects</h3>
          <ul className="space-y-1 text-[13px]">
            {defects.map((d: any) => (
              <li key={d.id}>
                {d.externalId}: {d.summary} — <StatusBadge value={d.status} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-faint">Timeline</h3>
        <ol className="space-y-3 border-l border-zinc-200 pl-4 dark:border-white/10">
          {(timeline ?? []).map((ev: any) => (
            <li key={ev.id} className="relative text-[13px]">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-zinc-400" />
              <p className="font-medium">{ev.title}</p>
              <p className="text-faint text-[11px]">{new Date(ev.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
