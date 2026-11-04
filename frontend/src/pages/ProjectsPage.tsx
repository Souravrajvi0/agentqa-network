import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth";
import { EmptyState, PageHeader } from "../components/ui";

type Project = { id: string; name: string; key: string; description?: string };

export function ProjectsPage() {
  const setProject = useAuthStore((s) => s.setSelectedProjectId);
  const { data, isLoading, error } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<{ projects: Project[] }>("/api/projects"),
  });

  return (
    <div className="mx-auto max-w-4xl p-6">
      <PageHeader title="Projects" subtitle="Select a project to open the collaboration workspace" />
      {isLoading ? <p className="text-slate-400">Loading…</p> : null}
      {error ? <p className="text-red-300">{(error as Error).message}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.projects.map((p) => (
          <Link
            key={p.id}
            to={`/projects/${p.id}/dashboard`}
            onClick={() => setProject(p.id)}
            className="card hover:border-brand-500"
          >
            <p className="text-xs text-brand-500">{p.key}</p>
            <p className="text-lg font-semibold">{p.name}</p>
            <p className="mt-2 text-sm text-slate-400">{p.description}</p>
          </Link>
        )) ?? null}
      </div>
      {!isLoading && !data?.projects.length ? (
        <EmptyState title="No projects" description="Ask an administrator to add you to a project." />
      ) : null}
    </div>
  );
}
