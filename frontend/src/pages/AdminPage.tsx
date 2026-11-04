import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth";
import { ErrorText, PageHeader } from "../components/ui";
import { invalidateProjectQueries } from "../hooks/useTestingContext";

export function AdminPage() {
  const { projectId = "" } = useParams();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState({
    roomId: "",
    roomName: "",
    bridgeBaseUrl: "",
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: any }>("/api/auth/me"),
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

  if (user?.globalRole !== "ADMINISTRATOR" && user?.globalRole !== "QA_LEAD") {
    return (
      <div>
        <PageHeader title="Administration" subtitle="Restricted to QA Lead and Administrator roles" />
        <p className="text-sm text-label">You do not have permission to manage project integrations.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Administration" subtitle="Project integrations and coordination tools" />
      <ErrorText message={error} />
      <section className="card mb-4">
        <h2 className="mb-2 font-medium">Project members</h2>
        <ul className="text-sm text-body-theme">
          {(me?.user?.projectMembers ?? [])
            .filter((m: any) => m.project?.id === projectId)
            .map((m: any) => (
              <li key={m.projectId + m.role}>
                {m.role} — project member
              </li>
            ))}
        </ul>
        <p className="mt-2 text-xs text-muted">Member management API can be extended; seed accounts cover demo roles.</p>
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
      <section className="card">
        <h2 className="mb-2 font-medium">QA coordination</h2>
        <p className="mb-3 text-sm text-label">Scan for unassigned critical tests and notify QA leads.</p>
        <button className="btn-primary" onClick={() => scan.mutate()}>
          Run coordination scan
        </button>
      </section>
    </div>
  );
}
