import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setToken } from "../lib/api";
import { useAuthStore } from "../stores/auth";
import { ErrorText } from "../components/ui";
import { ThemeToggle } from "../components/ThemeToggle";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await api<{ token: string; user: unknown }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setToken(res.token);
      const me = await api<{ user: unknown }>("/api/auth/me");
      setUser(me.user as Parameters<typeof setUser>[0]);
      navigate("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center app-canvas p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="logo-mark mx-auto mb-6 h-10 w-10 text-sm">AQ</div>
          <h1 className="text-[1.375rem] font-semibold tracking-[-0.02em] text-heading">Create account</h1>
          <p className="mt-2 text-[13px] text-label">
            Register as yourself, then create a project or get invited by an admin.
          </p>
        </div>
        <form onSubmit={onSubmit} className="card-elevated space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={1} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="mt-1 text-[11px] text-muted">Minimum 8 characters</p>
          </div>
          <ErrorText message={error} />
          <button className="btn-primary w-full" type="submit">
            Register
          </button>
          <p className="text-center text-[12px] text-label">
            Already have an account?{" "}
            <Link className="link-accent" to="/login">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
