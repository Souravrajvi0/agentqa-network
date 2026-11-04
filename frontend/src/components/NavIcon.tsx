const paths: Record<string, string> = {
  dashboard: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z",
  "test-cases": "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  "my-workspace": "M4 7h16v12H4V7Zm0 0 8 6 8-6",
  "team-board": "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 19a4 4 0 0 1 8 0M12 19a4 4 0 0 1 8 0",
  "design-decisions": "M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 0v18",
  "developer-changes": "M4 20h4l10-10-4-4L4 16v4Zm10-14 4 4",
  execution: "M8 5v14l11-7L8 5Z",
  defects: "M12 9v4M12 17h.01M10.3 4.7 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.7a2 2 0 0 0-3.4 0Z",
  agents: "M12 3v3M12 18v3M4.9 6.5l2.1 2.1M17 15.4l2.1 2.1M3 12h3M18 12h3M4.9 17.5l2.1-2.1M17 8.6l2.1-2.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  "release-readiness": "M5 12.5 9 16.5 19 6.5",
  admin: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM4 12h2M18 12h2M12 4v2M12 18v2",
};

export function NavIcon({ name }: { name: string }) {
  const d = paths[name] ?? paths.dashboard;
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 opacity-70">
      <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
