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
    <div className="relative">
      <details className="group">
        <summary
          className="btn-ghost relative h-8 w-8 shrink-0 list-none px-0 [&::-webkit-details-marker]:hidden"
          title="Notifications"
          aria-label="Notifications"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="mx-auto">
            <path
              d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M9.5 21a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {unread.length ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-sm border border-[var(--bg-canvas)] bg-rose-600 px-0.5 text-[9px] font-bold text-white">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          ) : null}
        </summary>
        <div className="absolute right-0 z-50 mt-2 max-h-80 w-80 overflow-auto rounded-sm border-theme bg-panel p-1.5 shadow-glow">
          <p className="border-b px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted" style={{ borderColor: "var(--divider)" }}>
            Notifications
          </p>
          {(data?.notifications ?? []).length === 0 ? (
            <p className="p-3 text-xs text-muted">No notifications yet</p>
          ) : (
            <ul className="space-y-1 p-1">
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
                      <button type="button" className="text-label hover:text-heading" onClick={() => markRead.mutate(n.id)}>
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
