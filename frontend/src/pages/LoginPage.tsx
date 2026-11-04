import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../lib/api";
import { useAuthStore } from "../stores/auth";
import { ErrorText, PageHeader } from "../components/ui";

export function LoginPage() {
  const [email, setEmail] = useState("qa.b@agentqa.demo");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await api<{ token: string; user: { id: string; email: string; name: string; globalRole: string } }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
      );
      setToken(res.token);
      setUser(res.user);
      navigate("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold">AQ</div>
          <h1 className="text-2xl font-semibold tracking-tight">AgentQA Network</h1>
          <p className="mt-2 text-sm text-zinc-500">Collaborative QA command center · Switch-ready</p>
        </div>
        <form onSubmit={onSubmit} className="card space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-500">Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-500">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <ErrorText message={error} />
          <button className="btn-primary w-full" type="submit">
            Sign in to workspace
          </button>
          <p className="text-center text-[11px] text-zinc-600">Demo: password123 · Local / tunnel use only</p>
        </form>
      </div>
    </div>
  );
}
