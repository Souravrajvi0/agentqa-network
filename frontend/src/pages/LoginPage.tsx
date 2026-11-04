import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../lib/api";
import { useAuthStore } from "../stores/auth";
import { PageHeader } from "../components/ui";

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
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <PageHeader title="Sign in" subtitle="Demo users seeded with password123" />
      <form onSubmit={onSubmit} className="card space-y-3">
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button className="btn-primary w-full" type="submit">
          Continue
        </button>
      </form>
    </div>
  );
}
