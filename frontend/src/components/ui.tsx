import clsx from "clsx";

/** Muted semantic badges — color only where it carries meaning */
const priorityStyles: Record<string, string> = {
  P0: "border-rose-500/40 bg-rose-950/50 text-rose-200",
  P1: "border-amber-500/35 bg-amber-950/40 text-amber-100",
  P2: "border-zinc-600 bg-zinc-900 text-zinc-300",
  P3: "border-zinc-700 bg-zinc-950 text-zinc-500",
};

const statusStyles: Record<string, string> = {
  AVAILABLE: "border-zinc-700 bg-zinc-900 text-zinc-400",
  CLAIMED: "border-zinc-500 bg-zinc-800 text-zinc-200",
  IN_PROGRESS: "border-zinc-500 bg-zinc-800 text-zinc-100",
  COMPLETED: "border-emerald-600/40 bg-emerald-950/40 text-emerald-200",
  BLOCKED: "border-amber-600/35 bg-amber-950/30 text-amber-100",
  PASSED: "border-emerald-600/40 bg-emerald-950/40 text-emerald-200",
  FAILED: "border-rose-600/40 bg-rose-950/40 text-rose-200",
  NOT_RUN: "border-zinc-800 bg-zinc-950 text-zinc-600",
  SUBMITTED: "border-amber-600/35 bg-amber-950/30 text-amber-100",
  APPROVED: "border-emerald-600/40 bg-emerald-950/40 text-emerald-200",
  NEW: "border-zinc-600 bg-zinc-900 text-zinc-300",
};

export function StatusBadge({ value }: { value: string }) {
  const style = priorityStyles[value] ?? statusStyles[value] ?? "border-zinc-700 bg-zinc-900 text-zinc-400";
  return (
    <span className={clsx("rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", style)}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function MonoId({ children }: { children: React.ReactNode }) {
  return <span className="mono-id">{children}</span>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="card border-dashed border-white/10 text-center text-zinc-500">
      <p className="font-medium text-zinc-300">{title}</p>
      {description ? <p className="mt-1 text-sm">{description}</p> : null}
    </div>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-md border border-rose-500/25 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">{message}</div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.06] pb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-zinc-500">{subtitle}</p> : null}
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
  const accent = {
    neutral: "border-l-zinc-600",
    success: "border-l-emerald-600",
    critical: "border-l-rose-500",
    warning: "border-l-amber-500",
    agent: "border-l-zinc-400",
  }[tone];

  return (
    <div className={clsx("card border-l-2 pl-4", accent)}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-600">{hint}</p> : null}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">{children}</h2>;
}
