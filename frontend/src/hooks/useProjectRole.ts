import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth";
import type { ProjectRole } from "../lib/roles";

type ProjectMember = {
  projectId: string;
  role: ProjectRole;
  project?: { id: string; name: string; key: string };
};

type MeUser = {
  id: string;
  projectMembers?: ProjectMember[];
};

export function useProjectRole(projectId: string | null | undefined) {
  const user = useAuthStore((s) => s.user) as MeUser | null;

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: MeUser }>("/api/auth/me"),
    enabled: Boolean(!user?.projectMembers?.length),
    staleTime: 60_000,
  });

  const memberships = user?.projectMembers ?? meData?.user?.projectMembers ?? [];

  return useMemo(() => {
    if (!projectId) return { role: null as ProjectRole | null, membership: null as ProjectMember | null };
    const membership = memberships.find((m) => m.projectId === projectId || m.project?.id === projectId);
    return { role: (membership?.role as ProjectRole) ?? null, membership: membership ?? null };
  }, [memberships, projectId]);
}
