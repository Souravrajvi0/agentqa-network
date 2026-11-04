import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getToken } from "../lib/api";

export function useRealtime(projectId?: string | null) {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const token = getToken();
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const ws = new WebSocket(`${proto}://${host}/ws?token=${encodeURIComponent(token ?? "")}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", projectId }));
    };

    ws.onmessage = () => {
      qc.invalidateQueries({ queryKey: ["dashboard", projectId] });
      qc.invalidateQueries({ queryKey: ["team-board", projectId] });
      qc.invalidateQueries({ queryKey: ["my-workspace", projectId] });
      qc.invalidateQueries({ queryKey: ["test-cases", projectId] });
      qc.invalidateQueries({ queryKey: ["defects", projectId] });
    };

    return () => ws.close();
  }, [projectId, qc]);
}
