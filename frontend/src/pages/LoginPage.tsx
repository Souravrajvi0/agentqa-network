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
    <div className="relative min-h-screen app-canvas">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2 lg:gap-8 lg:p-8">
        <section className="hero-panel mx-4 mt-16 flex flex-col justify-center lg:mx-0 lg:mt-0">
          <p className="eyebrow mb-4 text-teal-300">Delivery & QA command center</p>
          <h1 className="font-display text-[2rem] font-bold leading-[1.15] tracking-[-0.03em] lg:text-[2.35rem]">
            Know what to test, what ran, and when you&apos;re ready to release.
          </h1>
          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-stone-300">
            AgentQA Network connects development, CI, approved retest scope, QA execution, and release readiness —
            with human gates and agent boundaries built in.
          </p>
          <ul className="mt-8 space-y-3 text-[13px] text-stone-300">
            <li className="flex gap-2">
              <span className="text-teal-400">✓</span> Delivery pipeline with CI, scope, and handoffs
            </li>
            <li className="flex gap-2">
              <span className="text-teal-400">✓</span> Evidence preserved per build — no silent pass
            </li>
            <li className="flex gap-2">
              <span className="text-teal-400">✓</span> Agents via MCP; humans approve what matters
            </li>
          </ul>
        </section>

        <div className="flex flex-col justify-center px-4 pb-12 pt-8 lg:px-6 lg:py-12">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="logo-mark h-10 w-10 text-sm">AQ</div>
            <div>
              <p className="font-display text-lg font-bold tracking-tight text-heading">AgentQA Network</p>
              <p className="text-[12px] text-label">Sign in to continue</p>
            </div>
          </div>

          <section className="card mb-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-label">Quick demo sign-in</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  className="list-row text-left"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(DEMO_PASSWORD);
                    void signIn(account.email, DEMO_PASSWORD);
                  }}
                >
                  <p className="text-[13px] font-medium text-heading">{account.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{account.email}</p>
                </button>
              ))}
            </div>
          </section>

          <form onSubmit={onSubmit} className="card-elevated space-y-4">
            <div className="hidden lg:block">
              <p className="eyebrow">Welcome back</p>
              <h2 className="font-display mt-1 text-xl font-bold tracking-tight text-heading">Sign in</h2>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-label">Email</label>
              <input
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-label">Password</label>
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
              Sign in →
            </button>
            <p className="text-center text-[12px] text-label">
              New user?{" "}
              <Link className="link-accent" to="/register">
                Create account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
