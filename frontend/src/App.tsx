import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TestCaseDetailPage, TestCasesPage } from "./pages/TestCasesPage";
import { MyWorkspacePage, TeamBoardPage } from "./pages/WorkspacePages";
import {
  AgentsPage,
  DefectsPage,
  DesignDecisionsPage,
  DeveloperChangesPage,
  ExecutionPage,
  ReleaseReadinessPage,
} from "./pages/DomainPages";
import { AdminPage } from "./pages/AdminPage";
import { ProjectHomeRedirect } from "./components/ProjectHomeRedirect";
import { RequireProjectRole } from "./components/RequireProjectRole";
import { useAuthStore } from "./stores/auth";
import { useEffect } from "react";
import { api, getToken } from "./lib/api";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Guard({ slug, children }: { slug: string; children: React.ReactNode }) {
  return <RequireProjectRole slug={slug}>{children}</RequireProjectRole>;
}

export default function App() {
  const { setUser } = useAuthStore();

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api<{ user: any }>("/api/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => localStorage.removeItem("agentqa_token"));
  }, [setUser]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/projects"
        element={
          <RequireAuth>
            <ProjectsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<ProjectHomeRedirect />} />
        <Route path="dashboard" element={<Guard slug="dashboard"><DashboardPage /></Guard>} />
        <Route path="test-cases" element={<Guard slug="test-cases"><TestCasesPage /></Guard>} />
        <Route path="test-cases/:testCaseId" element={<Guard slug="test-cases"><TestCaseDetailPage /></Guard>} />
        <Route path="my-workspace" element={<Guard slug="my-workspace"><MyWorkspacePage /></Guard>} />
        <Route path="team-board" element={<Guard slug="team-board"><TeamBoardPage /></Guard>} />
        <Route path="design-decisions" element={<Guard slug="design-decisions"><DesignDecisionsPage /></Guard>} />
        <Route path="developer-changes" element={<Guard slug="developer-changes"><DeveloperChangesPage /></Guard>} />
        <Route path="execution" element={<Guard slug="execution"><ExecutionPage /></Guard>} />
        <Route path="defects" element={<Guard slug="defects"><DefectsPage /></Guard>} />
        <Route path="agents" element={<Guard slug="agents"><AgentsPage /></Guard>} />
        <Route path="admin" element={<Guard slug="admin"><AdminPage /></Guard>} />
        <Route path="release-readiness" element={<Guard slug="release-readiness"><ReleaseReadinessPage /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}
