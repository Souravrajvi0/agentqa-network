import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../stores/auth";
import { useRealtime } from "../hooks/useRealtime";
import { NotificationBell } from "./NotificationBell";
import { CommandPalette, CommandTrigger, PresenceStack } from "./CommandPalette";
import { ThemeToggle } from "./ThemeToggle";
import { NavIcon } from "./NavIcon";
import { ProjectSwitcher } from "./ProjectSwitcher";
import clsx from "clsx";
import { api } from "../lib/api";
import { clearSession } from "../lib/session";
import { useEffect, useMemo, useState } from "react";
import { useProjectRole } from "../hooks/useProjectRole";
import { canAccessAdmin, navSlugsForRole } from "../lib/roles";

const linkMeta: Record<string, string> = {
  dashboard: "Overview",
  delivery: "Delivery",
  "qa-inbox": "QA Inbox",
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
  { title: "Command", slugs: ["dashboard", "delivery", "qa-inbox"] },
  { title: "Testing", slugs: ["test-cases", "my-workspace", "team-board", "execution"] },
  { title: "Product", slugs: ["design-decisions", "developer-changes", "defects"] },
  { title: "Platform", slugs: ["agents", "release-readiness", "admin"] },
];

export function AppLayout() {
  const { projectId: routeProjectId = "" } = useParams();
  const { user, selectedProjectId, setSelectedProjectId } = useAuthStore();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const activeProjectId = selectedProjectId || routeProjectId;
  useRealtime(activeProjectId);
  const { role } = useProjectRole(activeProjectId);

  useEffect(() => {
    if (routeProjectId && routeProjectId !== selectedProjectId) {
      setSelectedProjectId(routeProjectId);
    }
  }, [routeProjectId, selectedProjectId, setSelectedProjectId]);

  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: () =>
      api<{
        projects: Array<{ id: string; name: string; key: string; myRole?: string | null }>;
      }>("/api/projects"),
  });

  const visibleSlugs = useMemo(() => {
    const slugs = navSlugsForRole(role ?? undefined);
    return navSections
      .map((section) => ({
        ...section,
        slugs: section.slugs.filter((slug) => {
          if (slug === "admin" && !canAccessAdmin(role ?? undefined)) return false;
          return slugs.includes(slug);
        }),
      }))
      .filter((section) => section.slugs.length > 0);
  }, [role]);

  const { data: dash } = useQuery({
    queryKey: ["dashboard", activeProjectId],
    queryFn: () => api<any>(`/api/projects/${activeProjectId}/dashboard`),
    enabled: Boolean(activeProjectId),
  });

  const { data: agentsData } = useQuery({
    queryKey: ["agents", activeProjectId],
    queryFn: () => api<{ agents: Array<{ displayName: string; agentType: string }>; rooms: unknown[] }>(`/api/projects/${activeProjectId}/agents`),
    enabled: Boolean(activeProjectId),
  });

  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<{ notifications: Array<{ read: boolean; type: string }> }>("/api/notifications"),
  });

  const unread = (notifData?.notifications ?? []).filter((n) => !n.read).length;
  const project = projectsData?.projects.find((p) => p.id === activeProjectId);
  const releaseLabel = dash?.activeCycle?.release?.version ?? "—";

  return (
    <div className="app-canvas min-h-screen">
      <CommandPalette projectId={activeProjectId} open={paletteOpen} onOpenChange={setPaletteOpen} />
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
            <div className="hidden min-w-0 sm:block">
              <ProjectSwitcher
                projects={projectsData?.projects ?? []}
                selectedProjectId={activeProjectId}
                onSelect={setSelectedProjectId}
              />
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
            {role && navSlugsForRole(role).includes("execution") ? (
            <button
              type="button"
              className="btn-primary hidden sm:inline-flex"
              onClick={() => activeProjectId && navigate(`/projects/${activeProjectId}/execution`)}
            >
              Run tests
            </button>
            ) : null}
            <NotificationBell />
            {user ? (
              <div className="hidden items-center gap-1 border-l pl-2 sm:flex" style={{ borderColor: "var(--divider)" }}>
                <span className="max-w-[120px] truncate text-[11px] text-label" title={user.email}>
                  {user.name}
                </span>
                <button
                  type="button"
                  className="btn-ghost px-2 text-[12px]"
                  onClick={() => {
                    clearSession();
                    navigate("/login");
                  }}
                >
                  Sign out
                </button>
              </div>
            ) : null}
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
          {activeProjectId
            ? visibleSlugs.map((section) => (
                <div key={section.title} className="nav-section">
                  <p className="nav-section-label">{section.title}</p>
                  <nav className="space-y-0.5">
                    {section.slugs.map((slug) => (
                      <NavLink
                        key={slug}
                        to={`/projects/${activeProjectId}/${slug}`}
                        className={({ isActive }) => clsx("nav-item", isActive && "nav-item-active")}
                      >
                        <span className="flex items-center gap-2">
                          <NavIcon name={slug} />
                          {linkMeta[slug]}
                        </span>
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
              clearSession();
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
