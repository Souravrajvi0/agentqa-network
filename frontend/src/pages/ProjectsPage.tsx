import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth";
import { EmptyState, MonoId, PageHeader } from "../components/ui";
import { ThemeToggle } from "../components/ThemeToggle";

type Project = { id: string; name: string; key: string; description?: string };

export function ProjectsPage() {
  const setProject = useAuthStore((s) => s.setSelectedProjectId);
  const { data, isLoading, error } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<{ projects: Project[] }>("/api/projects"),
  });

  return (
    <div className="relative mx-auto min-h-screen max-w-4xl bg-canvas p-6 lg:p-10">
      <div className="absolute right-4 top-4 lg:right-10 lg:top-10">
        <ThemeToggle />
      </div>
      <PageHeader title="Select project" subtitle="Choose a product workspace to open the QA command center" />
      {isLoading ? <p className="text-label">Loading projects…</p> : null}
      {error ? <p className="text-rose-300">{(error as Error).message}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.projects.map((p) => (
          <Link
            key={p.id}
            to={`/projects/${p.id}/dashboard`}
            onClick={() => setProject(p.id)}
            className="card-interactive group"
          >
            <MonoId>{p.key}</MonoId>
            <p className="mt-2 text-lg font-semibold text-heading group-hover:opacity-90">{p.name}</p>
            <p className="mt-2 text-sm text-label">{p.description}</p>
          </Link>
        )) ?? null}
      </div>
      {!isLoading && !data?.projects.length ? (
        <EmptyState title="No projects" description="Ask an administrator to add you to a project." />
      ) : null}
    </div>
  );
}
