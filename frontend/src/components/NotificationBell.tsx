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
        <summary className="cursor-pointer list-none rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900">
          Notifications
          {unread.length ? (
            <span className="ml-2 rounded-full bg-brand-500 px-2 py-0.5 text-xs text-white">{unread.length}</span>
          ) : null}
        </summary>
        <div className="absolute z-20 mt-2 max-h-80 w-72 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-2 shadow-xl">
          {(data?.notifications ?? []).length === 0 ? (
            <p className="p-2 text-xs text-slate-500">No notifications yet</p>
          ) : (
            <ul className="space-y-2">
              {(data?.notifications ?? []).map((n) => (
                <li key={n.id} className="rounded-lg border border-slate-800 p-2 text-xs">
                  <p className="font-medium text-slate-100">{n.title}</p>
                  <p className="text-slate-400">{n.body}</p>
                  <div className="mt-2 flex gap-2">
                    {n.linkPath && projectId ? (
                      <Link
                        className="text-brand-500 hover:underline"
                        to={n.linkPath.startsWith("/") ? n.linkPath : `/projects/${projectId}/${n.linkPath}`}
                        onClick={() => !n.read && markRead.mutate(n.id)}
                      >
                        Open
                      </Link>
                    ) : null}
                    {!n.read ? (
                      <button className="text-slate-400 hover:text-slate-200" onClick={() => markRead.mutate(n.id)}>
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
