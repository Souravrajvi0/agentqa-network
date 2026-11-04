import { create } from "zustand";

export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "agentqa_theme";

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" ? "light" : "dark";
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function initTheme() {
  applyTheme(readStoredTheme());
}

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: readStoredTheme(),
  setMode: (mode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    applyTheme(mode);
    set({ mode });
  },
  toggle: () => {
    const next = get().mode === "dark" ? "light" : "dark";
    get().setMode(next);
  },
}));
