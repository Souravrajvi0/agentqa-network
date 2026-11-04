import { create } from "zustand";
import type { User } from "../lib/api";

type AuthState = {
  user: User | null;
  setUser: (user: User | null) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  selectedProjectId: localStorage.getItem("agentqa_project") || null,
  setSelectedProjectId: (id) => {
    if (id) localStorage.setItem("agentqa_project", id);
    else localStorage.removeItem("agentqa_project");
    set({ selectedProjectId: id });
  },
}));
