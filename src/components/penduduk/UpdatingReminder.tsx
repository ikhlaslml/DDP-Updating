"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { fieldLabel } from "@/lib/field-labels";
import { mapping } from "@/lib/indikator";

type Summary = { trackedFields: number; dueFields: number; dueResidents: number; topFields: { field: string; count: number }[] };
type Response = { residentCount: number; sixMonths: Summary; annual: Summary };

export function UpdatingReminder() {
  const [data, setData] = useState<Response | null>(null);
  useEffect(() => { fetch("/api/updating/reminders").then((response) => response.json()).then(setData).catch(() => setData(null)); }, []);
  if (!data) return null;
  return <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><CalendarClock className="h-5 w-5" /></span><div><h2 className="text-lg font-bold text-slate-900">Pengingat Jadwal Updating</h2><p className="mt-1 text-xs text-slate-500">Pengingat tidak mengunci form; operator tetap dapat memperbarui data sebelum jatuh tempo.</p></div></div><div className="mt-4 grid gap-4 md:grid-cols-2">{[["6 Bulan", data.sixMonths], ["1 Tahun", data.annual]].map(([label, raw]) => { const summary = raw as Summary; const clear = summary.dueFields === 0; return <article key={label as string} className={`rounded-2xl border p-4 ${clear ? "border-emerald-100 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Siklus {label as string}</p><p className="mt-1 text-2xl font-bold text-slate-900">{summary.dueResidents} <span className="text-sm font-medium text-slate-500">penduduk perlu ditinjau</span></p></div>{clear ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <CalendarClock className="h-6 w-6 text-amber-600" />}</div><p className="mt-2 text-xs text-slate-600">{summary.trackedFields} parameter terjadwal · {summary.dueFields} isian jatuh tempo</p>{summary.topFields.length ? <div className="mt-3 flex flex-wrap gap-1.5">{summary.topFields.map((item) => <span key={item.field} className="rounded-full bg-white/80 px-2 py-1 text-[11px] text-slate-700">{fieldLabel(item.field, mapping.kolom[item.field])}: {item.count}</span>)}</div> : null}</article>; })}</div></section>;
}
