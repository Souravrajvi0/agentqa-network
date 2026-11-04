/** Seeded demo accounts — password for all: password123 */
export const DEMO_ACCOUNTS = [
  {
    id: "admin",
    label: "Administrator",
    email: "admin@agentqa.demo",
    hint: "All projects · members · agents · admin",
  },
  {
    id: "lead",
    label: "QA Lead",
    email: "lead@agentqa.demo",
    hint: "Coordination · approve changes · assign tests",
  },
  {
    id: "tester",
    label: "QA Engineer",
    email: "qa.b@agentqa.demo",
    hint: "PAY: tester · ECOM: lead (multi-role demo)",
  },
  {
    id: "developer",
    label: "Developer",
    email: "dev.a@agentqa.demo",
    hint: "Changes · defects · register dev/QA agents",
  },
  {
    id: "viewer",
    label: "Viewer",
    email: "viewer@agentqa.demo",
    hint: "Read-only PAY & IDP",
  },
] as const;

export const DEMO_PASSWORD = "password123";
