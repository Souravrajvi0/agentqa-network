import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { api } from "../lib/api";
import { navSlugsForRole } from "../lib/roles";
import { useProjectRole } from "../hooks/useProjectRole";

const NAV = [
  ["dashboard", "Overview Dashboard"],
  ["delivery", "Delivery Pipeline"],
  ["qa-inbox", "QA Inbox"],
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

type SearchResults = {
  testCases: Array<{ id: string; externalId: string; title: string }>;
  defects: Array<{ id: string; externalId: string; summary: string }>;
  changes: Array<{ id: string; title: string }>;
  knowledge: Array<{ id: string; title: string }>;
  members: Array<{ user: { name: string; email: string } }>;
};

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
  const { role } = useProjectRole(pid);
  const allowedSlugs = navSlugsForRole(role ?? undefined);

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

  const { data: searchData } = useQuery({
    queryKey: ["search", pid, q],
    queryFn: () =>
      api<{ results: SearchResults }>(`/api/projects/${pid}/search?q=${encodeURIComponent(q)}`),
    enabled: open && Boolean(pid) && q.trim().length >= 2,
  });

  if (!open || !pid) return null;

  const filteredNav = NAV.filter(
    ([slug, label]) => allowedSlugs.includes(slug) && label.toLowerCase().includes(q.toLowerCase()),
  );
  const results = searchData?.results;
  const hasEntityResults =
    q.trim().length >= 2 &&
    results &&
    (results.testCases.length ||
      results.defects.length ||
      results.changes.length ||
      results.knowledge.length ||
      results.members.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] backdrop-blur-sm"
      style={{ backgroundColor: "var(--overlay)" }}
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-sm border-theme bg-panel shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b px-4 py-3" style={{ borderColor: "var(--divider)" }}>
          <input
            autoFocus
            className="w-full bg-transparent text-[13px] text-heading outline-none placeholder:text-muted"
            placeholder="Search tests, defects, changes, knowledge, members…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <ul className="max-h-80 overflow-auto p-1.5">
          {hasEntityResults ? (
            <>
              {results!.testCases.map((tc) => (
                <li key={tc.id}>
                  <button
                    type="button"
                    className="w-full rounded-sm px-3 py-2 text-left text-[13px] hover:bg-[var(--bg-hover)]"
                    onClick={() => {
                      navigate(`/projects/${pid}/test-cases/${tc.id}`);
                      onOpenChange(false);
                    }}
                  >
                    <span className="text-label">Test · </span>
                    {tc.externalId} — {tc.title}
                  </button>
                </li>
              ))}
              {results!.defects.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    className="w-full rounded-sm px-3 py-2 text-left text-[13px] hover:bg-[var(--bg-hover)]"
                    onClick={() => {
                      navigate(`/projects/${pid}/defects`);
                      onOpenChange(false);
                    }}
                  >
                    <span className="text-label">Defect · </span>
                    {d.externalId} — {d.summary}
                  </button>
                </li>
              ))}
              {results!.changes.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full rounded-sm px-3 py-2 text-left text-[13px] hover:bg-[var(--bg-hover)]"
                    onClick={() => {
                      navigate(`/projects/${pid}/developer-changes`);
                      onOpenChange(false);
                    }}
                  >
                    <span className="text-label">Change · </span>
                    {c.title}
                  </button>
                </li>
              ))}
            </>
          ) : null}
          {filteredNav.map(([slug, label]) => (
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
                <span className="text-faint mr-2">View</span>
                {label}
              </button>
            </li>
          ))}
          {!filteredNav.length && !hasEntityResults ? (
            <li className="px-3 py-4 text-sm text-muted">No matches — try another keyword.</li>
          ) : null}
        </ul>
        <p className="border-t px-4 py-2 text-[10px] uppercase tracking-wider text-faint" style={{ borderColor: "var(--divider)" }}>
          ⌘K · Global search + navigation
        </p>
      </div>
    </div>
  );
}

export function CommandTrigger({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex h-8 w-full items-center justify-between gap-2 rounded-sm border-theme bg-[var(--bg-hover)] px-3 text-[11px] text-label transition duration-150 hover:border-[var(--border-strong)]",
        className,
      )}
    >
      <span className="truncate">Search tests, defects, views…</span>
      <kbd className="surface-inset shrink-0 px-1.5 py-0.5 font-mono text-[10px] text-faint">⌘K</kbd>
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
