import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { formatRoleLabel, type ProjectRole } from "../lib/roles";

type ProjectRow = {
  id: string;
  name: string;
  key: string;
  myRole?: ProjectRole | string | null;
};

type Props = {
  projects: ProjectRow[];
  selectedProjectId: string | null;
  onSelect: (id: string) => void;
};

export function ProjectSwitcher({ projects, selectedProjectId, onSelect }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = projects.find((p) => p.id === selectedProjectId);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!projects.length) return null;

  return (
    <div className="relative hidden min-w-0 sm:block" ref={ref}>
      <button
        type="button"
        className="btn-ghost max-w-[220px] truncate px-2 text-left text-[13px] font-medium"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-label mr-1.5 font-normal">Project</span>
        {current?.name ?? "Select…"}
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-md border bg-[var(--surface)] py-1 shadow-lg"
          style={{ borderColor: "var(--divider)" }}
        >
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              className={clsx(
                "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-hover)]",
                p.id === selectedProjectId && "bg-[var(--surface-hover)]",
              )}
              onClick={() => {
                onSelect(p.id);
                setOpen(false);
                navigate(`/projects/${p.id}/dashboard`);
              }}
            >
              <span className="min-w-0 truncate font-medium text-heading">{p.name}</span>
              <span className="shrink-0 text-xs text-label">
                {p.myRole ? formatRoleLabel(p.myRole as ProjectRole) : p.key}
              </span>
            </button>
          ))}
          <button
            type="button"
            className="w-full border-t px-3 py-2 text-left text-sm text-label hover:bg-[var(--surface-hover)]"
            style={{ borderColor: "var(--divider)" }}
            onClick={() => {
              setOpen(false);
              navigate("/projects");
            }}
          >
            All projects…
          </button>
        </div>
      ) : null}
    </div>
  );
}
