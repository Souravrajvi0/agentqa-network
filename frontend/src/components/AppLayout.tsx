import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../stores/auth";
import { useRealtime } from "../hooks/useRealtime";
import { NotificationBell } from "./NotificationBell";
import { CommandPalette, CommandTrigger, PresenceStack } from "./CommandPalette";
import { ThemeToggle } from "./ThemeToggle";
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
    <div className="min-h-screen bg-canvas">
      <CommandPalette projectId={selectedProjectId} open={paletteOpen} onOpenChange={setPaletteOpen} />
      <header className="shell-header">
        <div className="flex h-12 items-center gap-3 px-4 lg:px-6">
          <button type="button" className="btn-ghost px-2 lg:hidden" onClick={() => setSidebarOpen((v) => !v)}>
            ☰
          </button>
          <div className="flex items-center gap-2">
            <div className="logo-mark h-7 w-7">AQ</div>
            <div className="hidden sm:block">
              <p className="text-[13px] font-semibold leading-none tracking-tight text-heading">AgentQA Network</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-faint">Switch orchestration</p>
            </div>
          </div>

          <div className="mx-2 hidden h-6 w-px md:block" style={{ backgroundColor: "var(--border-subtle)" }} />

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <select
              className="input h-8 max-w-[140px] truncate py-0 text-[11px] text-label sm:max-w-[200px]"
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
            <span className="chip hidden md:inline">v{releaseLabel}</span>
          </div>

          <div className="hidden flex-1 justify-center md:flex">
            <CommandTrigger onClick={() => setPaletteOpen(true)} />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 lg:flex">
              <span
                className={clsx(
                  "chip gap-1.5 normal-case tracking-normal",
                  switchLinked ? "border-emerald-500/25 text-emerald-700 dark:text-emerald-200/90" : "text-faint",
                )}
              >
                <span className={clsx("h-1 w-1 rounded-sm", switchLinked ? "bg-emerald-400" : "bg-zinc-600")} />
                Switch {switchLinked ? "linked" : "offline"}
              </span>
              <PresenceStack agents={agentsData?.agents ?? []} />
            </div>
            <ThemeToggle />
            <button type="button" className="btn-primary hidden sm:inline-flex" onClick={() => selectedProjectId && navigate(`/projects/${selectedProjectId}/execution`)}>
              Run tests
            </button>
            <span className="hidden text-xs text-label xl:inline">{user?.name}</span>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[248px_1fr]">
        <aside
          className={clsx(
            "border-b bg-sidebar p-3 lg:border-b-0 lg:border-r",
            sidebarOpen ? "block" : "hidden lg:block",
          )}
          style={{ borderColor: "var(--divider)" }}
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
                      <span className="chip border-amber-500/40 text-amber-900 dark:border-amber-500/25 dark:text-amber-100/90">{unread}</span>
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

        <main className="min-h-[calc(100vh-3rem)] p-5 lg:p-7">
          <Outlet context={{ project, releaseLabel }} />
        </main>
      </div>
    </div>
  );
}
