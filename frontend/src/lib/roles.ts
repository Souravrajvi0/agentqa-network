export type ProjectRole =
  | "ADMINISTRATOR"
  | "QA_LEAD"
  | "QA_ENGINEER"
  | "DEVELOPER"
  | "VIEWER";

const navByRole: Record<ProjectRole, string[]> = {
  ADMINISTRATOR: [
    "dashboard",
    "test-cases",
    "my-workspace",
    "team-board",
    "execution",
    "design-decisions",
    "developer-changes",
    "defects",
    "agents",
    "release-readiness",
    "admin",
  ],
  QA_LEAD: [
    "dashboard",
    "test-cases",
    "my-workspace",
    "team-board",
    "execution",
    "design-decisions",
    "developer-changes",
    "defects",
    "agents",
    "release-readiness",
    "admin",
  ],
  QA_ENGINEER: [
    "dashboard",
    "test-cases",
    "my-workspace",
    "execution",
    "design-decisions",
    "defects",
    "release-readiness",
  ],
  DEVELOPER: [
    "dashboard",
    "test-cases",
    "design-decisions",
    "developer-changes",
    "defects",
    "release-readiness",
  ],
  VIEWER: ["dashboard", "test-cases", "defects", "release-readiness", "design-decisions"],
};

export function navSlugsForRole(role: ProjectRole | null | undefined): string[] {
  if (!role) return ["dashboard"];
  return navByRole[role] ?? ["dashboard"];
}

export function canManageProject(role: ProjectRole | null | undefined): boolean {
  return role === "ADMINISTRATOR";
}

export function canManageMembers(role: ProjectRole | null | undefined): boolean {
  return role === "ADMINISTRATOR" || role === "QA_LEAD";
}

export function canEditTestCases(role: ProjectRole | null | undefined): boolean {
  return role === "ADMINISTRATOR" || role === "QA_LEAD" || role === "QA_ENGINEER";
}

export function canAccessAdmin(role: ProjectRole | null | undefined): boolean {
  return role === "ADMINISTRATOR" || role === "QA_LEAD";
}

export function defaultLandingPath(role: ProjectRole | null | undefined): string {
  switch (role) {
    case "QA_ENGINEER":
      return "my-workspace";
    case "DEVELOPER":
      return "developer-changes";
    default:
      return "dashboard";
  }
}

export function formatRoleLabel(role: ProjectRole): string {
  return role.replace(/_/g, " ");
}
