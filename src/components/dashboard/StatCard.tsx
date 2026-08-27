import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  dotColor,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  dotColor?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500">
          {dotColor && <span className="inline-block h-2 w-2 rounded-full" style={{ background: dotColor }} />}
          {label}
        </div>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="mt-2 break-words text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}
