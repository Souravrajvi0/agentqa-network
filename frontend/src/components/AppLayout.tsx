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

const linkMeta: Record<string, string> = {
  dashboard: "Overview",
  "test-cases": "Test Cases",
  "my-workspace": "My Workspace",
  "team-board": "Team Board",
  "design-decisions": "Design Decisions",
  "developer-changes": "Developer Changes",
  execution: "Execution",
  defects: "Defects",
  agents: "Agents",
  "release-readiness": "Release Readiness",
  admin: "Admin",
};

const navSections: { title: string; slugs: string[] }[] = [
  { title: "Command", slugs: ["dashboard"] },
  { title: "Testing", slugs: ["test-cases", "my-workspace", "team-board", "execution"] },
  { title: "Product", slugs: ["design-decisions", "developer-changes", "defects"] },
  { title: "Platform", slugs: ["agents", "release-readiness", "admin"] },
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

  return (
    <div className="app-canvas min-h-screen">
      <CommandPalette projectId={selectedProjectId} open={paletteOpen} onOpenChange={setPaletteOpen} />
      <header className="shell-header">
        <div className="relative mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4 lg:px-6">
          <button type="button" className="btn-ghost shrink-0 px-2 lg:hidden" onClick={() => setSidebarOpen((v) => !v)}>
            ☰
          </button>

          <div className="flex min-w-0 shrink-0 items-center gap-2.5">
            <div className="logo-mark h-7 w-7 shrink-0">AQ</div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-[13px] font-semibold leading-none tracking-tight text-heading">AgentQA Network</p>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 hidden justify-center px-[min(24rem,28vw)] md:flex">
            <div className="pointer-events-auto w-full max-w-md">
              <CommandTrigger onClick={() => setPaletteOpen(true)} />
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="hidden xl:block">
              <PresenceStack agents={agentsData?.agents ?? []} />
            </div>
            <ThemeToggle />
            <button
              type="button"
              className="btn-primary hidden sm:inline-flex"
              onClick={() => selectedProjectId && navigate(`/projects/${selectedProjectId}/execution`)}
            >
              Run tests
            </button>
            <NotificationBell />
          </div>
        </div>
      </header>

      <div className="mx-auto lg:grid lg:max-w-[1600px] lg:grid-cols-[240px_1fr]">
        <aside
          className={clsx(
            "border-b bg-sidebar p-3 lg:sticky lg:top-12 lg:h-[calc(100vh-3rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-3 lg:py-4",
            sidebarOpen ? "block" : "hidden lg:block",
          )}
          style={{ borderColor: "var(--divider)" }}
        >
          {selectedProjectId
            ? navSections.map((section) => (
                <div key={section.title} className="nav-section">
                  <p className="nav-section-label">{section.title}</p>
                  <nav className="space-y-0.5">
                    {section.slugs.map((slug) => (
                      <NavLink
                        key={slug}
                        to={`/projects/${selectedProjectId}/${slug}`}
                        className={({ isActive }) => clsx("nav-item", isActive && "nav-item-active")}
                      >
                        <span>{linkMeta[slug]}</span>
                        {slug === "developer-changes" && unread > 0 ? (
                          <span className="chip border-amber-500/40 text-amber-900 dark:border-amber-500/25 dark:text-amber-100/90">{unread}</span>
                        ) : null}
                      </NavLink>
                    ))}
                  </nav>
                </div>
              ))
            : null}
          <button
            className="btn-ghost mt-8 w-full text-label"
            onClick={() => {
              setUser(null);
              localStorage.removeItem("agentqa_token");
              navigate("/login");
            }}
          >
            Sign out
          </button>
        </aside>

        <main className="min-h-[calc(100vh-3rem)] p-5 lg:p-8">
          <div className="content-frame">
            <Outlet context={{ project, releaseLabel }} />
          </div>
        </main>
      </div>
    </div>
  );
}
