import { Navigate, useParams } from "react-router-dom";
import { useProjectRole } from "../hooks/useProjectRole";
import { navSlugsForRole, type ProjectRole } from "../lib/roles";
import { PageHeader } from "./ui";

export function RequireProjectRole({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const { projectId = "" } = useParams();
  const { role } = useProjectRole(projectId);
  const allowed = navSlugsForRole(role ?? undefined);

  if (!role) {
    return (
      <div>
        <PageHeader title="Unauthorized" subtitle="You are not a member of this project." />
      </div>
    );
  }

  if (slug === "admin" && !["ADMINISTRATOR", "QA_LEAD"].includes(role)) {
    return <Navigate to={`/projects/${projectId}/dashboard`} replace />;
  }

  if (!allowed.includes(slug)) {
    return (
      <div>
        <PageHeader
          title="Not available for your role"
          subtitle={`Your project role (${role.replace(/_/g, " ")}) cannot access this view.`}
        />
      </div>
    );
  }

  return <>{children}</>;
}

export function roleCanWriteDefects(role: ProjectRole | null): boolean {
  return role === "QA_ENGINEER" || role === "QA_LEAD" || role === "DEVELOPER" || role === "ADMINISTRATOR";
}
