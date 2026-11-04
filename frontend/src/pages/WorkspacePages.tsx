import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { ErrorText, PageHeader, StatusBadge } from "../components/ui";
import { invalidateProjectQueries } from "../hooks/useTestingContext";

export function MyWorkspacePage() {
  const { projectId = "" } = useParams();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["my-workspace", projectId],
    queryFn: () => api<any>(`/api/projects/${projectId}/my-workspace`),
  });

  const claim = useMutation({
    mutationFn: (assignmentId: string) =>
      api(`/api/assignments/${assignmentId}/claim`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      setError(null);
      invalidateProjectQueries(qc, projectId);
    },
    onError: (e: Error) => setError(e.message),
  });

  const recordManual = useMutation({
    mutationFn: (payload: {
      cycleCaseId: string;
      buildId: string;
      status: string;
      notes?: string;
    }) => api("/api/executions/manual", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      setError(null);
      invalidateProjectQueries(qc, projectId);
    },
    onError: (e: Error) => setError(e.message),
  });

  const release = useMutation({
    mutationFn: (assignmentId: string) =>
      api(`/api/assignments/${assignmentId}/release`, { method: "POST", body: "{}" }),
    onSuccess: () => invalidateProjectQueries(qc, projectId),
  });

  const buildId = data?.currentBuild?.id;

  return (
    <div>
      <PageHeader title="My Testing Workspace" subtitle="Claim work, record manual results, and track assignments" />
      <ErrorText message={error} />
      {isLoading ? <p className="text-slate-400">Loading workspace…</p> : null}
      {!buildId ? <p className="mb-4 text-sm text-amber-200">No current build — seed/migration may be incomplete.</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-medium">My assignments</h2>
          <ul className="space-y-3 text-sm">
            {(data?.assignments ?? []).map((a: any) => (
              <li key={a.id} className="rounded-lg border border-slate-800 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{a.testCycleCase.testCase.externalId}</p>
                  <StatusBadge value={a.status} />
                </div>
                <p className="text-slate-400">{a.testCycleCase.testCase.title}</p>
                {buildId ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      className="input min-h-[60px]"
                      placeholder="Actual results / notes"
                      value={notes[a.id] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      {(["PASSED", "FAILED", "BLOCKED"] as const).map((status) => (
                        <button
                          key={status}
                          className="btn-ghost"
                          disabled={recordManual.isPending}
                          onClick={() =>
                            recordManual.mutate({
                              cycleCaseId: a.testCycleCase.id,
                              buildId,
                              status,
                              notes: notes[a.id],
                            })
                          }
                        >
                          Mark {status}
                        </button>
                      ))}
                      <button className="btn-ghost" onClick={() => release.mutate(a.id)}>
                        Release
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
            {!data?.assignments?.length && !isLoading ? (
              <p className="text-slate-500">No active assignments — claim a recommended test.</p>
            ) : null}
          </ul>
        </section>

        <section className="card">
          <h2 className="mb-3 font-medium">Recommended next tests</h2>
          <ul className="space-y-2 text-sm">
            {(data?.recommended ?? []).map((item: any) => (
              <li key={item.cycleCaseId} className="rounded-lg border border-slate-800 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.testCase.externalId}</p>
                    <p className="text-slate-400">{item.testCase.title}</p>
                  </div>
                  <StatusBadge value={item.recommendation?.recommended ?? item.testCase.priority} />
                </div>
                {item.assignment?.status === "AVAILABLE" ? (
                  <button
                    className="btn-primary mt-2"
                    disabled={claim.isPending}
                    onClick={() => claim.mutate(item.assignment.id)}
                  >
                    Claim
                  </button>
                ) : (
                  <p className="mt-2 text-xs text-amber-200">
                    Owned by{" "}
                    {item.assignment?.assigneeUser?.name ??
                      item.assignment?.assigneeAgent?.displayName ??
                      "another participant"}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export function TeamBoardPage() {
  const { projectId = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["team-board", projectId],
    queryFn: () => api<any>(`/api/projects/${projectId}/team-board`),
  });

  const duplicateWarnings = (data?.cases ?? []).filter(
    (c: any) => c.assignment?.status === "CLAIMED" || c.assignment?.status === "IN_PROGRESS",
  );

  return (
    <div>
      <PageHeader title="Team Testing Board" subtitle="Assignments, agents, and duplicate-work visibility" />
      {isLoading ? <p className="text-slate-400">Loading board…</p> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="mb-3 font-medium">{data?.cycle?.name ?? "Cycle"}</h2>
          <ul className="space-y-2 text-sm">
            {(data?.cases ?? []).map((c: any) => (
              <li key={c.id} className="flex items-center justify-between border-b border-slate-800 py-2">
                <div>
                  <p className="font-medium">{c.testCase.externalId}</p>
                  <p className="text-slate-400">{c.testCase.title}</p>
                </div>
                <div className="text-right">
                  <StatusBadge value={c.assignment?.status ?? "AVAILABLE"} />
                  <p className="mt-1 text-xs text-slate-500">
                    {c.assignment?.assigneeUser?.name ?? c.assignment?.assigneeAgent?.displayName ?? "Unassigned"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="mb-3 font-medium">Agents</h2>
          <ul className="space-y-2 text-sm">
            {(data?.agents ?? []).map((a: any) => (
              <li key={a.id} className="rounded border border-slate-800 p-2">
                <p className="font-medium">{a.displayName}</p>
                <p className="text-xs text-slate-400">
                  {a.agentType} · owner {a.owner.name}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">{duplicateWarnings.length} active claims in this cycle</p>
        </section>
      </div>
    </div>
  );
}
