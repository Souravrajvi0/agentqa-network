import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";

const NAV = [
  ["dashboard", "Overview Dashboard"],
  ["test-cases", "Test Case Explorer"],
  ["my-workspace", "My Testing Workspace"],
  ["team-board", "Team Testing Board"],
  ["design-decisions", "Design Decision Center"],
  ["developer-changes", "Developer Change Center"],
  ["execution", "Test Execution Center"],
  ["defects", "Defect Workspace"],
  ["agents", "Agent Collaboration"],
  ["release-readiness", "Release Readiness"],
  ["admin", "Administration"],
] as const;

export function CommandPalette({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const params = useParams();
  const pid = projectId ?? params.projectId ?? "";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open || !pid) return null;

  const filtered = NAV.filter(([, label]) => label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] backdrop-blur-sm" style={{ backgroundColor: "var(--overlay)" }} onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-lg overflow-hidden rounded-sm border-theme bg-panel shadow-glow" onClick={(e) => e.stopPropagation()}>
        <div className="border-b px-4 py-3" style={{ borderColor: "var(--divider)" }}>
          <input
            autoFocus
            className="w-full bg-transparent text-[13px] text-heading outline-none placeholder:text-muted"
            placeholder="Search views… (tests & defects search coming soon)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <ul className="max-h-72 overflow-auto p-1.5">
          {filtered.map(([slug, label]) => (
            <li key={slug}>
              <button
                type="button"
                className="w-full rounded-sm px-3 py-2 text-left text-[13px] text-label transition duration-150 hover:bg-[var(--bg-hover)] hover:text-heading"
                onClick={() => {
                  navigate(`/projects/${pid}/${slug}`);
                  onOpenChange(false);
                  setQ("");
                }}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
        <p className="border-t px-4 py-2 text-[10px] uppercase tracking-wider text-faint" style={{ borderColor: "var(--divider)" }}>⌘K · Navigate workspace</p>
      </div>
    </div>
  );
}

export function CommandTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden h-8 items-center gap-2 rounded-sm border-theme bg-[var(--bg-hover)] px-3 text-[11px] text-label transition duration-150 hover:border-[var(--border-strong)] md:flex"
    >
      <span>Search & commands</span>
      <kbd className="surface-inset px-1.5 py-0.5 font-mono text-[10px] text-faint">⌘K</kbd>
    </button>
  );
}

export function PresenceStack({ agents }: { agents: Array<{ displayName: string; agentType: string }> }) {
  const colors = ["bg-zinc-600", "bg-zinc-500", "bg-zinc-700", "bg-zinc-400"];
  return (
    <div className="flex items-center -space-x-2">
      {agents.slice(0, 4).map((a, i) => (
        <div
          key={a.displayName + i}
          title={`${a.displayName} (${a.agentType})`}
          className={clsx(
            "flex h-7 w-7 items-center justify-center rounded-sm border-2 text-[9px] font-semibold tracking-tight text-white shadow-sm",
            colors[i % colors.length],
          )}
          style={{ borderColor: "var(--avatar-ring)" }}
        >
          {a.displayName.slice(0, 2).toUpperCase()}
        </div>
      ))}
    </div>
  );
}
