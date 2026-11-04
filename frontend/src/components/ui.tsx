import clsx from "clsx";

const map: Record<string, string> = {
  P0: "bg-red-500/20 text-red-300",
  P1: "bg-orange-500/20 text-orange-200",
  P2: "bg-yellow-500/20 text-yellow-100",
  P3: "bg-slate-600/40 text-slate-200",
  AVAILABLE: "bg-slate-700 text-slate-200",
  CLAIMED: "bg-blue-500/20 text-blue-200",
  IN_PROGRESS: "bg-indigo-500/20 text-indigo-200",
  COMPLETED: "bg-emerald-500/20 text-emerald-200",
  BLOCKED: "bg-amber-500/20 text-amber-100",
  PASSED: "bg-emerald-500/20 text-emerald-200",
  FAILED: "bg-red-500/20 text-red-200",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", map[value] ?? "bg-slate-700")}>{value}</span>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="card text-center text-slate-300">
      <p className="font-medium text-slate-100">{title}</p>
      {description ? <p className="mt-1 text-sm">{description}</p> : null}
    </div>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-red-300">{message}</p>;
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
    </div>
  );
}
