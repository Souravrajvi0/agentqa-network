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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-600/80 bg-zinc-900 shadow-glow" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-zinc-700/80 px-4 py-3">
          <input
            autoFocus
            className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500"
            placeholder="Search views… (tests & defects search coming soon)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <ul className="max-h-72 overflow-auto p-2">
          {filtered.map(([slug, label]) => (
            <li key={slug}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800"
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
        <p className="border-t border-zinc-800 px-4 py-2 text-[11px] text-zinc-500">⌘K · Navigate workspace</p>
      </div>
    </div>
  );
}

export function CommandTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="hidden items-center gap-2 rounded-lg border border-zinc-700/80 bg-zinc-900/50 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-600 md:flex">
      <span>Search & commands</span>
      <kbd className="rounded border border-zinc-600 bg-zinc-800 px-1.5 font-mono text-[10px] text-zinc-400">⌘K</kbd>
    </button>
  );
}

export function PresenceStack({ agents }: { agents: Array<{ displayName: string; agentType: string }> }) {
  const colors = ["bg-violet-500", "bg-indigo-500", "bg-teal-500", "bg-emerald-500"];
  return (
    <div className="flex items-center -space-x-2">
      {agents.slice(0, 4).map((a, i) => (
        <div
          key={a.displayName + i}
          title={`${a.displayName} (${a.agentType})`}
          className={clsx("flex h-8 w-8 items-center justify-center rounded-full border-2 border-canvas text-[10px] font-semibold text-white", colors[i % colors.length])}
        >
          {a.displayName.slice(0, 2).toUpperCase()}
        </div>
      ))}
    </div>
  );
}
