export function StatCard({
  label,
  value,
  hint,
  dotColor,
}: {
  label: string;
  value: string;
  hint?: string;
  dotColor?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
        {dotColor && <span className="inline-block h-2 w-2 rounded-full" style={{ background: dotColor }} />}
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-0.5">{hint}</div>}
    </div>
  );
}
