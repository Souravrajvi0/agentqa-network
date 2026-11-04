export type ProjectRole =
  | "ADMINISTRATOR"
  | "QA_LEAD"
  | "QA_ENGINEER"
  | "DEVELOPER"
  | "VIEWER";

const navByRole: Record<ProjectRole, string[]> = {
  ADMINISTRATOR: [
    "dashboard",
    "delivery",
    "qa-inbox",
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
    "delivery",
    "qa-inbox",
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
    "delivery",
    "qa-inbox",
    "test-cases",
    "my-workspace",
    "execution",
    "design-decisions",
    "defects",
    "agents",
    "release-readiness",
  ],
  DEVELOPER: [
    "dashboard",
    "delivery",
    "test-cases",
    "design-decisions",
    "developer-changes",
    "defects",
    "agents",
    "release-readiness",
  ],
  VIEWER: ["dashboard", "delivery", "test-cases", "defects", "release-readiness", "design-decisions"],
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

export function canRegisterAgents(role: ProjectRole | null | undefined): boolean {
  return (
    role === "ADMINISTRATOR" ||
    role === "QA_LEAD" ||
    role === "QA_ENGINEER" ||
    role === "DEVELOPER"
  );
}

export function formatRoleLabel(role: ProjectRole): string {
  return role.replace(/_/g, " ");
}
