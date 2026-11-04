import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth";

type Notification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  linkPath?: string;
  createdAt: string;
};

export function NotificationBell() {
  const projectId = useAuthStore((s) => s.selectedProjectId);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<{ notifications: Notification[] }>("/api/notifications"),
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api(`/api/notifications/${id}/read`, { method: "POST", body: "{}" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = (data?.notifications ?? []).filter((n) => !n.read);

  return (
    <div className="relative mb-4">
      <details className="group">
        <summary className="cursor-pointer list-none rounded-sm border-theme bg-[var(--bg-hover)] px-3 py-2 text-[13px] text-label transition duration-150 hover:border-[var(--border-strong)]">
          Notifications
          {unread.length ? (
            <span className="chip ml-2 text-heading">{unread.length}</span>
          ) : null}
        </summary>
        <div className="absolute z-20 mt-2 max-h-80 w-72 overflow-auto rounded-sm border-theme bg-panel p-1.5 shadow-glow">
          {(data?.notifications ?? []).length === 0 ? (
            <p className="p-2 text-xs text-muted">No notifications yet</p>
          ) : (
            <ul className="space-y-2">
              {(data?.notifications ?? []).map((n) => (
                <li key={n.id} className="rounded-sm border p-2.5 text-[11px]" style={{ borderColor: "var(--border-faint)" }}>
                  <p className="font-medium text-heading">{n.title}</p>
                  <p className="text-label">{n.body}</p>
                  <div className="mt-2 flex gap-2">
                    {n.linkPath && projectId ? (
                      <Link
                        className="link-accent"
                        to={n.linkPath.startsWith("/") ? n.linkPath : `/projects/${projectId}/${n.linkPath}`}
                        onClick={() => !n.read && markRead.mutate(n.id)}
                      >
                        Open
                      </Link>
                    ) : null}
                    {!n.read ? (
                      <button className="text-label hover:text-heading" onClick={() => markRead.mutate(n.id)}>
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
}
