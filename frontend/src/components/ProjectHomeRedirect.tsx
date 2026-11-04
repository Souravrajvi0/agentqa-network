import { Navigate, useParams } from "react-router-dom";
import { useProjectRole } from "../hooks/useProjectRole";
import { defaultLandingPath } from "../lib/roles";

export function ProjectHomeRedirect() {
  const { projectId = "" } = useParams();
  const { role } = useProjectRole(projectId);
  const slug = defaultLandingPath(role);
  return <Navigate to={`/projects/${projectId}/${slug}`} replace />;
}
