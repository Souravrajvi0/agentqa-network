import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth";
import { useRealtime } from "../hooks/useRealtime";
import { NotificationBell } from "./NotificationBell";
import clsx from "clsx";

const links = [
  ["dashboard", "Overview"],
  ["test-cases", "Test Cases"],
  ["my-workspace", "My Workspace"],
  ["team-board", "Team Board"],
  ["design-decisions", "Design Decisions"],
  ["developer-changes", "Developer Changes"],
  ["execution", "Execution"],
  ["defects", "Defects"],
  ["agents", "Agents"],
  ["admin", "Admin"],
  ["release-readiness", "Release Readiness"],
] as const;

export function AppLayout() {
  const { user, selectedProjectId, setUser } = useAuthStore();
  const navigate = useNavigate();
  useRealtime(selectedProjectId);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-slate-800 bg-slate-950 p-4 lg:border-b-0 lg:border-r">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-brand-500">AgentQA Network</p>
          <p className="text-lg font-semibold">Switch-powered QA</p>
          <p className="text-xs text-slate-400">{user?.name}</p>
        </div>
        <NotificationBell />
        <nav className="space-y-1">
          {selectedProjectId
            ? links.map(([slug, label]) => (
                <NavLink
                  key={slug}
                  to={`/projects/${selectedProjectId}/${slug}`}
                  className={({ isActive }) =>
                    clsx(
                      "block rounded-lg px-3 py-2 text-sm",
                      isActive ? "bg-brand-500/20 text-brand-500" : "text-slate-300 hover:bg-slate-900",
                    )
                  }
                >
                  {label}
                </NavLink>
              ))
            : null}
        </nav>
        <button
          className="btn-ghost mt-8 w-full"
          onClick={() => {
            setUser(null);
            localStorage.removeItem("agentqa_token");
            navigate("/login");
          }}
        >
          Sign out
        </button>
      </aside>
      <main className="p-4 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
