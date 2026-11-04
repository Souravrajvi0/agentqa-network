import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useTestingContext(projectId: string) {
  return useQuery({
    queryKey: ["testing-context", projectId],
    queryFn: () =>
      api<{
        activeCycle: { id: string; name: string; releaseId?: string } | null;
        currentBuild: { id: string; label: string } | null;
        environments: { id: string; name: string }[];
        testCases: { id: string; externalId: string; title: string }[];
      }>(`/api/projects/${projectId}/testing-context`),
    enabled: Boolean(projectId),
  });
}

export function invalidateProjectQueries(qc: { invalidateQueries: (o: { queryKey: string[] }) => void }, projectId: string) {
  for (const key of [
    "dashboard",
    "my-workspace",
    "team-board",
    "defects",
    "dev-changes",
    "design",
    "agents",
    "readiness",
    "execution-center",
    "testing-context",
    "test-cases",
    "notifications",
  ]) {
    qc.invalidateQueries({ queryKey: [key, projectId] });
  }
  qc.invalidateQueries({ queryKey: ["notifications"] });
}
