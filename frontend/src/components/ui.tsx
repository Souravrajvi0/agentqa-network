import clsx from "clsx";

const priorityStyles: Record<string, string> = {
  P0: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  P1: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  P2: "bg-sky-500/15 text-sky-200 ring-sky-500/30",
  P3: "bg-zinc-600/30 text-zinc-300 ring-zinc-500/20",
};

const statusStyles: Record<string, string> = {
  AVAILABLE: "bg-zinc-700/50 text-zinc-300",
  CLAIMED: "bg-indigo-500/15 text-indigo-200",
  IN_PROGRESS: "bg-violet-500/15 text-violet-200",
  COMPLETED: "bg-emerald-500/15 text-emerald-300",
  BLOCKED: "bg-amber-500/15 text-amber-200",
  PASSED: "bg-emerald-500/15 text-emerald-300",
  FAILED: "bg-rose-500/15 text-rose-300",
  NOT_RUN: "bg-zinc-700/40 text-zinc-400",
  SUBMITTED: "bg-amber-500/15 text-amber-200",
  APPROVED: "bg-emerald-500/15 text-emerald-300",
  NEW: "bg-sky-500/15 text-sky-200",
};

export function StatusBadge({ value }: { value: string }) {
  const style = priorityStyles[value] ?? statusStyles[value] ?? "bg-zinc-700/50 text-zinc-300";
  return (
    <span className={clsx("rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset", style)}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function MonoId({ children }: { children: React.ReactNode }) {
  return <span className="mono-id">{children}</span>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="card border-dashed text-center text-zinc-400">
      <p className="font-medium text-zinc-200">{title}</p>
      {description ? <p className="mt-1 text-sm">{description}</p> : null}
    </div>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{message}</div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-zinc-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "neutral" | "success" | "critical" | "warning" | "agent";
}) {
  const toneRing = {
    neutral: "border-zinc-700/80",
    success: "border-emerald-500/30",
    critical: "border-rose-500/35",
    warning: "border-amber-500/35",
    agent: "border-violet-500/35",
  }[tone];

  return (
    <div className={clsx("card", toneRing)}>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-50">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">{children}</h2>;
}
