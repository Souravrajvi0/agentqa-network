import clsx from "clsx";

/** Priority badges — high contrast; urgency reads at a glance */
const priorityStyles: Record<string, string> = {
  P0:
    "border-rose-700 bg-rose-600 text-white shadow-[0_0_0_1px_rgba(190,18,60,0.25)] dark:border-rose-400/60 dark:bg-rose-500/25 dark:text-rose-100 dark:shadow-none",
  P1:
    "border-amber-600 bg-amber-500 text-amber-950 shadow-[0_0_0_1px_rgba(217,119,6,0.3)] dark:border-amber-400/55 dark:bg-amber-500/20 dark:text-amber-100 dark:shadow-none",
  P2:
    "border-zinc-400 bg-zinc-200 text-zinc-800 dark:border-white/15 dark:bg-white/[0.07] dark:text-zinc-200",
  P3:
    "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400",
};

const statusStyles: Record<string, string> = {
  AVAILABLE: "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400",
  CLAIMED: "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-200",
  IN_PROGRESS: "border-zinc-300 bg-zinc-100 text-zinc-900 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-100",
  COMPLETED:
    "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100",
  BLOCKED:
    "border-amber-600 bg-amber-100 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-100",
  PASSED:
    "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100",
  FAILED:
    "border-rose-700 bg-rose-600 text-white dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-100",
  NOT_RUN: "border-zinc-200 bg-transparent text-zinc-500 dark:border-white/[0.06] dark:text-zinc-600",
  SUBMITTED:
    "border-amber-600 bg-amber-100 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-100",
  APPROVED:
    "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100",
  NEW: "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300",
};

export function StatusBadge({ value }: { value: string }) {
  const isPriority = /^P[0-3]$/.test(value);
  const style =
    priorityStyles[value] ??
    statusStyles[value] ??
    "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400";
  return (
    <span
      className={clsx(
        "inline-flex h-5 items-center rounded-sm border px-1.5 text-[9px] font-semibold uppercase tracking-[0.08em]",
        isPriority && (value === "P0" || value === "P1") && "font-bold tracking-[0.1em]",
        style,
      )}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function MonoId({ children }: { children: React.ReactNode }) {
  return <span className="mono-id">{children}</span>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="card border-dashed py-12 text-center text-label">
      <p className="text-[13px] font-medium text-heading">{title}</p>
      {description ? <p className="mt-2 text-[13px] text-faint">{description}</p> : null}
    </div>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-sm border border-rose-500/25 bg-rose-50 px-3 py-2 text-[13px] text-rose-800 dark:border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-100">{message}</div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b pb-5" style={{ borderColor: "var(--divider)" }}>
      <div>
        <h1 className="text-[1.375rem] font-semibold tracking-[-0.02em] text-heading">{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-[13px] text-label">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const metricDot: Record<string, string> = {
  neutral: "bg-zinc-500",
  success: "bg-emerald-500",
  critical: "bg-rose-500",
  warning: "bg-amber-500",
  agent: "bg-zinc-400",
};

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
  return (
    <div className="card flex flex-col justify-between">
      <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
        <span className={clsx("h-1 w-1 shrink-0 rounded-sm", metricDot[tone])} aria-hidden />
        {label}
      </p>
      <p className="mt-3 text-[1.75rem] font-semibold leading-none tracking-[-0.03em] tabular-nums text-heading">{value}</p>
      {hint ? <p className="mt-2 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">{children}</h2>
  );
}
