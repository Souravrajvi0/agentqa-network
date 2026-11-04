const API_BASE = import.meta.env.VITE_API_URL ?? "";

export type User = {
  id: string;
  email: string;
  name: string;
  globalRole: string;
};

export function getToken(): string | null {
  return localStorage.getItem("agentqa_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("agentqa_token", token);
  else localStorage.removeItem("agentqa_token");
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }

  return res.json() as Promise<T>;
}
