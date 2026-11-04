import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, getToken, setToken } from "../lib/api";
import { useAuthStore } from "../stores/auth";
import { ErrorText } from "../components/ui";
import { ThemeToggle } from "../components/ThemeToggle";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../lib/demoAccounts";

export function LoginPage() {
  if (getToken()) {
    return <Navigate to="/projects" replace />;
  }

  const [email, setEmail] = useState("qa.b@agentqa.demo");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  async function signIn(loginEmail: string, loginPassword: string) {
    setError(null);
    try {
      const res = await api<{ token: string; user: { id: string; email: string; name: string; globalRole: string } }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ email: loginEmail, password: loginPassword }) },
      );
      setToken(res.token);
      const me = await api<{ user: unknown }>("/api/auth/me");
      setUser(me.user as Parameters<typeof setUser>[0]);
      navigate("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signIn(email, password);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center app-canvas p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="logo-mark mx-auto mb-6 h-10 w-10 text-sm">AQ</div>
          <h1 className="text-[1.375rem] font-semibold tracking-[-0.02em] text-heading">AgentQA Network</h1>
          <p className="mt-2 text-[13px] text-label">Sign in as admin, QA, developer, or viewer · register your own user & agents</p>
        </div>

        <section className="card mb-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-label">Demo personas (password123)</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.id}
                type="button"
                className="list-row text-left transition hover:border-[var(--border-strong)]"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(DEMO_PASSWORD);
                  void signIn(account.email, DEMO_PASSWORD);
                }}
              >
                <p className="text-[13px] font-medium text-heading">{account.label}</p>
                <p className="mt-0.5 text-[11px] text-muted">{account.email}</p>
                <p className="mt-1 text-[11px] text-label">{account.hint}</p>
              </button>
            ))}
          </div>
        </section>

        <form onSubmit={onSubmit} className="card-elevated space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-label">Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <ErrorText message={error} />
          <button className="btn-primary w-full" type="submit">
            Sign in
          </button>
          <p className="text-center text-[12px] text-label">
            New user?{" "}
            <Link className="link-accent" to="/register">
              Create account
            </Link>
            — then ask a project admin to add you, or create a project yourself.
          </p>
        </form>
      </div>
    </div>
  );
}
