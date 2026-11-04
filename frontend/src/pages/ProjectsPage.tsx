import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth";
import { EmptyState, ErrorText, MonoId, PageHeader } from "../components/ui";
import { ThemeToggle } from "../components/ThemeToggle";
import { clearSession } from "../lib/session";
import { formatRoleLabel, type ProjectRole } from "../lib/roles";

type Project = {
  id: string;
  name: string;
  key: string;
  description?: string;
  myRole?: ProjectRole | null;
  health?: { openDefects?: number; pendingTests?: number };
};

export function ProjectsPage() {
  const navigate = useNavigate();
  const { user, setSelectedProjectId: setProject } = useAuthStore();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ key: "", name: "", description: "" });
  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<{ projects: Project[] }>("/api/projects"),
  });

  const canCreate = true;

  const createProject = useMutation({
    mutationFn: () =>
      api<{ project: Project }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          key: form.key.toUpperCase(),
          name: form.name,
          description: form.description || undefined,
        }),
      }),
    onSuccess: (res) => {
      setError(null);
      setForm({ key: "", name: "", description: "" });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setProject(res.project.id);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="relative mx-auto min-h-screen max-w-4xl app-canvas p-6 lg:p-10">
      <div className="absolute right-4 top-4 flex items-center gap-2 lg:right-10 lg:top-10">
        {user ? (
          <span className="hidden max-w-[160px] truncate text-[12px] text-label sm:inline" title={user.email}>
            {user.name}
          </span>
        ) : null}
        <button
          type="button"
          className="btn-ghost text-[12px]"
          onClick={() => {
            clearSession();
            navigate("/login");
          }}
        >
          Sign out
        </button>
        <ThemeToggle />
      </div>
      <PageHeader title="Projects" subtitle="Multi-project workspaces with project-scoped roles" />
      <ErrorText message={error} />
      {canCreate ? (
        <section className="card mb-6 space-y-2">
          <h2 className="text-sm font-medium text-heading">Create project</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              className="input"
              placeholder="Key (e.g. ECOM)"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
            />
            <input
              className="input sm:col-span-2"
              placeholder="Project name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <input
            className="input"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button
            className="btn-primary"
            disabled={!form.key || !form.name || createProject.isPending}
            onClick={() => createProject.mutate()}
          >
            Create project
          </button>
        </section>
      ) : null}
      {isLoading ? <p className="text-label">Loading projects…</p> : null}
      {loadError ? <p className="text-critical-inline">{(loadError as Error).message}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.projects.map((p) => (
          <Link
            key={p.id}
            to={`/projects/${p.id}`}
            onClick={() => setProject(p.id)}
            className="card-interactive group"
          >
            <div className="flex items-center justify-between gap-2">
              <MonoId>{p.key}</MonoId>
              {p.myRole ? (
                <span className="chip text-xs">{formatRoleLabel(p.myRole)}</span>
              ) : null}
            </div>
            <p className="mt-2 text-lg font-semibold text-heading group-hover:opacity-90">{p.name}</p>
            <p className="mt-2 text-sm text-label">{p.description}</p>
            {p.health ? (
              <p className="mt-3 text-xs text-muted">
                {p.health.pendingTests ?? 0} pending tests · {p.health.openDefects ?? 0} open defects
              </p>
            ) : null}
          </Link>
        )) ?? null}
      </div>
      {!isLoading && !data?.projects.length ? (
        <EmptyState title="No projects" description="Ask an administrator to add you to a project." />
      ) : null}
    </div>
  );
}
