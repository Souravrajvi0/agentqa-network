import { setToken } from "./api";
import { useAuthStore } from "../stores/auth";

export function clearSession() {
  setToken(null);
  const { setUser, setSelectedProjectId } = useAuthStore.getState();
  setUser(null);
  setSelectedProjectId(null);
}
