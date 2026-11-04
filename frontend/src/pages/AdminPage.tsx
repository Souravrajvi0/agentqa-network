import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { ErrorText, PageHeader } from "../components/ui";
import { invalidateProjectQueries } from "../hooks/useTestingContext";
import { useProjectRole } from "../hooks/useProjectRole";
import { canAccessAdmin, canManageMembers, formatRoleLabel, type ProjectRole } from "../lib/roles";

type Member = {
  id: string;
  role: ProjectRole;
  user: { id: string; email: string; name: string };
};

export function AdminPage() {
  const { projectId = "" } = useParams();
  const { role } = useProjectRole(projectId);
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState({
    roomId: "",
    roomName: "",
    bridgeBaseUrl: "",
  });
  const [memberForm, setMemberForm] = useState({ email: "", role: "QA_ENGINEER" as ProjectRole });

  const { data: switchStatus } = useQuery({
    queryKey: ["switch-status", projectId],
    queryFn: () => api<any>(`/api/projects/${projectId}/switch-status`),
    enabled: Boolean(projectId) && canAccessAdmin(role),
  });

  const { data: auditData } = useQuery({
    queryKey: ["audit", projectId],
    queryFn: () => api<{ events: any[] }>(`/api/projects/${projectId}/audit-events`),
    enabled: Boolean(projectId) && canAccessAdmin(role),
  });

  const { data: membersData, refetch: refetchMembers } = useQuery({
    queryKey: ["members", projectId],
    queryFn: () => api<{ members: Member[] }>(`/api/projects/${projectId}/members`),
    enabled: Boolean(projectId) && canAccessAdmin(role),
  });

  const linkRoom = useMutation({
    mutationFn: () =>
      api(`/api/projects/${projectId}/switch-rooms`, {
        method: "POST",
        body: JSON.stringify(roomForm),
      }),
    onSuccess: () => {
      setError(null);
      invalidateProjectQueries(qc, projectId);
    },
    onError: (e: Error) => setError(e.message),
  });

  const scan = useMutation({
    mutationFn: () => api(`/api/projects/${projectId}/coordination/scan`, { method: "POST", body: "{}" }),
    onSuccess: () => invalidateProjectQueries(qc, projectId),
    onError: (e: Error) => setError(e.message),
  });

  const addMember = useMutation({
    mutationFn: () =>
      api(`/api/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify(memberForm),
      }),
    onSuccess: () => {
      setError(null);
      setMemberForm({ email: "", role: "QA_ENGINEER" });
      refetchMembers();
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!canAccessAdmin(role)) {
    return (
      <div>
        <PageHeader title="Administration" subtitle="Restricted to project QA Lead and Administrator roles" />
        <p className="text-sm text-label">You do not have permission to manage this project.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Administration" subtitle="Members, integrations, and coordination" />
      <ErrorText message={error} />
      <section className="card mb-4 space-y-3">
        <h2 className="font-medium">Project members</h2>
        <ul className="divide-y text-sm" style={{ borderColor: "var(--divider)" }}>
          {(membersData?.members ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2">
              <span>
                <span className="font-medium text-heading">{m.user.name}</span>
                <span className="text-label"> — {m.user.email}</span>
              </span>
              <span className="chip text-xs">{formatRoleLabel(m.role)}</span>
            </li>
          ))}
        </ul>
        {canManageMembers(role) ? (
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              className="input sm:col-span-2"
              placeholder="User email"
              value={memberForm.email}
              onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
            />
            <select
              className="input"
              value={memberForm.role}
              onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as ProjectRole })}
            >
              {(["ADMINISTRATOR", "QA_LEAD", "QA_ENGINEER", "DEVELOPER", "VIEWER"] as ProjectRole[]).map((r) => (
                <option key={r} value={r}>
                  {formatRoleLabel(r)}
                </option>
              ))}
            </select>
            <button className="btn-primary sm:col-span-3 sm:w-fit" onClick={() => addMember.mutate()}>
              Add or update member
            </button>
          </div>
        ) : null}
      </section>
      <section className="card mb-4 space-y-2">
        <h2 className="font-medium">Switch integration</h2>
        <p className="text-sm text-body-theme">{switchStatus?.message}</p>
        <p className="text-xs text-label">Status: {switchStatus?.status ?? "unknown"}</p>
        <ul className="text-xs text-muted">
          {(switchStatus?.projectRooms ?? []).map((r: any) => (
            <li key={r.id}>
              {r.roomName} ({r.roomId})
            </li>
          ))}
        </ul>
      </section>
      <section className="card mb-4 space-y-2">
        <h2 className="font-medium">Link Switch room</h2>
        <input className="input" placeholder="Room ID" value={roomForm.roomId} onChange={(e) => setRoomForm({ ...roomForm, roomId: e.target.value })} />
        <input className="input" placeholder="Room name" value={roomForm.roomName} onChange={(e) => setRoomForm({ ...roomForm, roomName: e.target.value })} />
        <input className="input" placeholder="Bridge base URL" value={roomForm.bridgeBaseUrl} onChange={(e) => setRoomForm({ ...roomForm, bridgeBaseUrl: e.target.value })} />
        <button className="btn-primary" onClick={() => linkRoom.mutate()}>
          Save room link
        </button>
      </section>
      <section className="card mb-4">
        <h2 className="mb-2 font-medium">QA coordination</h2>
        <button className="btn-secondary" onClick={() => scan.mutate()}>
          Scan for unassigned critical tests
        </button>
      </section>
      <section className="card">
        <h2 className="mb-2 font-medium">Audit trail</h2>
        <ul className="max-h-64 space-y-2 overflow-auto text-xs text-label">
          {(auditData?.events ?? []).map((e) => (
            <li key={e.id} className="border-b pb-2" style={{ borderColor: "var(--divider)" }}>
              <span className="font-medium text-heading">{e.action}</span>
              <span className="text-muted"> · {new Date(e.createdAt).toLocaleString()}</span>
              <p>{e.user?.name ?? "System"} · {e.entityType}</p>
            </li>
          ))}
          {!auditData?.events?.length ? <li>No audit events recorded yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}
