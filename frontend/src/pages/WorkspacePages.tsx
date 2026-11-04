import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { ErrorText, EmptyState, MonoId, PageHeader, SectionTitle, StatusBadge } from "../components/ui";
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
      {!buildId && !isLoading ? (
        <p className="mb-4 text-sm text-warning">No current build — seed or migration may be incomplete.</p>
      ) : null}

      {isLoading ? <p className="text-label">Loading workspace…</p> : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card">
          <SectionTitle>My assignments</SectionTitle>
          <ul className="space-y-3">
            {(data?.assignments ?? []).map((a: any) => (
              <li key={a.id} className="list-row">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <MonoId>{a.testCycleCase.testCase.externalId}</MonoId>
                    <p className="mt-1.5 text-[13px] font-medium leading-snug text-heading">{a.testCycleCase.testCase.title}</p>
                  </div>
                  <StatusBadge value={a.status} />
                </div>
                {buildId ? (
                  <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "var(--divider)" }}>
                    <textarea
                      className="input min-h-[64px] py-2"
                      placeholder="Actual results / notes"
                      value={notes[a.id] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      {(["PASSED", "FAILED", "BLOCKED"] as const).map((status) => (
                        <button
                          key={status}
                          className="btn-ghost h-7 px-2.5 text-[12px]"
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
                          {status === "PASSED" ? "Pass" : status === "FAILED" ? "Fail" : "Block"}
                        </button>
                      ))}
                      <button className="btn-ghost h-7 px-2.5 text-[12px] text-muted" onClick={() => release.mutate(a.id)}>
                        Release
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          {!data?.assignments?.length && !isLoading ? (
            <EmptyState title="No active assignments" description="Claim a recommended test from the queue." />
          ) : null}
        </section>

        <section className="card">
          <SectionTitle>Recommended next</SectionTitle>
          <ul className="space-y-3">
            {(data?.recommended ?? []).map((item: any) => (
              <li key={item.cycleCaseId} className="list-row">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <MonoId>{item.testCase.externalId}</MonoId>
                    <p className="mt-1.5 text-[13px] font-medium leading-snug text-heading">{item.testCase.title}</p>
                  </div>
                  <StatusBadge value={item.recommendation?.recommended ?? item.testCase.priority} />
                </div>
                {item.assignment?.status === "AVAILABLE" ? (
                  <button
                    className="btn-primary mt-3"
                    disabled={claim.isPending}
                    onClick={() => claim.mutate(item.assignment.id)}
                  >
                    Claim
                  </button>
                ) : (
                  <p className="mt-3 text-[12px] text-muted">
                    Owned by{" "}
                    {item.assignment?.assigneeUser?.name ??
                      item.assignment?.assigneeAgent?.displayName ??
                      "another participant"}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {!data?.recommended?.length && !isLoading ? (
            <EmptyState title="Queue is clear" description="No recommended tests for this cycle." />
          ) : null}
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
      {isLoading ? <p className="text-label">Loading board…</p> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="mb-3 font-medium">{data?.cycle?.name ?? "Cycle"}</h2>
          <ul className="space-y-2 text-sm">
            {(data?.cases ?? []).map((c: any) => (
              <li key={c.id} className="list-row flex items-center justify-between gap-4 py-2.5">
                <div>
                  <p className="font-medium">{c.testCase.externalId}</p>
                  <p className="text-label">{c.testCase.title}</p>
                </div>
                <div className="text-right">
                  <StatusBadge value={c.assignment?.status ?? "AVAILABLE"} />
                  <p className="mt-1 text-xs text-muted">
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
              <li key={a.id} className="list-row py-2.5">
                <p className="font-medium">{a.displayName}</p>
                <p className="text-xs text-label">
                  {a.agentType} · owner {a.owner.name}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">{duplicateWarnings.length} active claims in this cycle</p>
        </section>
      </div>
    </div>
  );
}
