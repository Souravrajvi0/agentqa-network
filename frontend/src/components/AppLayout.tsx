import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../stores/auth";
import { useRealtime } from "../hooks/useRealtime";
import { NotificationBell } from "./NotificationBell";
import { CommandPalette, CommandTrigger, PresenceStack } from "./CommandPalette";
import clsx from "clsx";
import { api } from "../lib/api";
import { useState } from "react";

const links: { slug: string; label: string; abbr: string }[] = [
  { slug: "dashboard", label: "Overview", abbr: "A" },
  { slug: "test-cases", label: "Test Cases", abbr: "B" },
  { slug: "my-workspace", label: "My Workspace", abbr: "C" },
  { slug: "team-board", label: "Team Board", abbr: "D" },
  { slug: "design-decisions", label: "Design Decisions", abbr: "E" },
  { slug: "developer-changes", label: "Developer Changes", abbr: "F" },
  { slug: "execution", label: "Execution", abbr: "G" },
  { slug: "defects", label: "Defects", abbr: "H" },
  { slug: "agents", label: "Agents", abbr: "I" },
  { slug: "release-readiness", label: "Release Readiness", abbr: "J" },
  { slug: "admin", label: "Admin", abbr: "K" },
];

export function AppLayout() {
  const { user, selectedProjectId, setUser, setSelectedProjectId } = useAuthStore();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useRealtime(selectedProjectId);

  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<{ projects: Array<{ id: string; name: string; key: string }> }>("/api/projects"),
  });

  const { data: dash } = useQuery({
    queryKey: ["dashboard", selectedProjectId],
    queryFn: () => api<any>(`/api/projects/${selectedProjectId}/dashboard`),
    enabled: Boolean(selectedProjectId),
  });

  const { data: agentsData } = useQuery({
    queryKey: ["agents", selectedProjectId],
    queryFn: () => api<{ agents: Array<{ displayName: string; agentType: string }>; rooms: unknown[] }>(`/api/projects/${selectedProjectId}/agents`),
    enabled: Boolean(selectedProjectId),
  });

  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<{ notifications: Array<{ read: boolean; type: string }> }>("/api/notifications"),
  });

  const unread = (notifData?.notifications ?? []).filter((n) => !n.read).length;
  const project = projectsData?.projects.find((p) => p.id === selectedProjectId);
  const releaseLabel = dash?.activeCycle?.release?.version ?? "—";
  const switchLinked = (agentsData?.rooms?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-[#09090b]">
      <CommandPalette projectId={selectedProjectId} open={paletteOpen} onOpenChange={setPaletteOpen} />
      <header className="shell-header">
        <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
          <button type="button" className="btn-ghost px-2 lg:hidden" onClick={() => setSidebarOpen((v) => !v)}>
            ☰
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white text-[10px] font-bold text-black">AQ</div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-none text-zinc-100">AgentQA Network</p>
              <p className="text-[11px] text-zinc-500">Switch orchestration</p>
            </div>
          </div>

          <div className="mx-2 hidden h-6 w-px bg-zinc-700 md:block" />

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <select
              className="max-w-[140px] truncate rounded-md border border-white/10 bg-[#0c0c0e] px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-white/25 sm:max-w-[200px]"
              value={selectedProjectId ?? ""}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                navigate(`/projects/${e.target.value}/dashboard`);
              }}
            >
              {(projectsData?.projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.key} · {p.name}
                </option>
              ))}
            </select>
            <span className="hidden rounded-md border border-white/10 bg-[#0c0c0e] px-2 py-1 font-mono text-[11px] text-zinc-500 md:inline">
              v{releaseLabel}
            </span>
          </div>

          <div className="hidden flex-1 justify-center md:flex">
            <CommandTrigger onClick={() => setPaletteOpen(true)} />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 lg:flex">
              <span
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px]",
                  switchLinked ? "border-emerald-700/50 bg-emerald-950/40 text-emerald-300" : "border-white/10 text-zinc-600",
                )}
              >
                <span className={clsx("h-1.5 w-1.5 rounded-full", switchLinked ? "bg-emerald-400 animate-pulse" : "bg-zinc-500")} />
                Switch {switchLinked ? "linked" : "offline"}
              </span>
              <PresenceStack agents={agentsData?.agents ?? []} />
            </div>
            <button type="button" className="btn-primary hidden sm:inline-flex" onClick={() => selectedProjectId && navigate(`/projects/${selectedProjectId}/execution`)}>
              Run tests
            </button>
            <span className="hidden text-xs text-zinc-400 xl:inline">{user?.name}</span>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[248px_1fr]">
        <aside
          className={clsx(
            "border-b border-white/[0.06] bg-[#0a0a0c] p-4 lg:border-b-0 lg:border-r lg:border-white/[0.06]",
            sidebarOpen ? "block" : "hidden lg:block",
          )}
        >
          <NotificationBell />
          <nav className="space-y-0.5">
            {selectedProjectId
              ? links.map(({ slug, label }) => (
                  <NavLink
                    key={slug}
                    to={`/projects/${selectedProjectId}/${slug}`}
                    className={({ isActive }) => clsx("nav-item", isActive && "nav-item-active")}
                  >
                    <span>{label}</span>
                    {slug === "developer-changes" && unread > 0 ? (
                      <span className="rounded-full border border-amber-700/40 bg-amber-950/50 px-1.5 text-[10px] text-amber-200">{unread}</span>
                    ) : null}
                  </NavLink>
                ))
              : null}
          </nav>
          <button
            className="btn-ghost mt-6 w-full"
            onClick={() => {
              setUser(null);
              localStorage.removeItem("agentqa_token");
              navigate("/login");
            }}
          >
            Sign out
          </button>
        </aside>

        <main className="min-h-[calc(100vh-3.5rem)] p-4 lg:p-8">
          <Outlet context={{ project, releaseLabel }} />
        </main>
      </div>
    </div>
  );
}
