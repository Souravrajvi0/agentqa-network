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
import { useAuthStore } from "./stores/auth";
import { useEffect } from "react";
import { api, getToken } from "./lib/api";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
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
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="test-cases" element={<TestCasesPage />} />
        <Route path="test-cases/:testCaseId" element={<TestCaseDetailPage />} />
        <Route path="my-workspace" element={<MyWorkspacePage />} />
        <Route path="team-board" element={<TeamBoardPage />} />
        <Route path="design-decisions" element={<DesignDecisionsPage />} />
        <Route path="developer-changes" element={<DeveloperChangesPage />} />
        <Route path="execution" element={<ExecutionPage />} />
        <Route path="defects" element={<DefectsPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="release-readiness" element={<ReleaseReadinessPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}
