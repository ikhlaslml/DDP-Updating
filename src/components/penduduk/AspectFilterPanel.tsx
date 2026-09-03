"use client";

import { CheckCheck, ListFilter, RotateCcw } from "lucide-react";
import {
  KELOMPOK_LABEL,
  KELOMPOK_ORDER,
  operationalColumnsForKelompok,
  operationalKolomByKelompok,
  type KelompokIndikator,
} from "@/lib/indikator";

const GROUPED = operationalKolomByKelompok();

export function AspectFilterPanel({
  selected,
  onChange,
}: {
  selected: Set<KelompokIndikator>;
  onChange: (next: Set<KelompokIndikator>) => void;
}) {
  const activeColumns = operationalColumnsForKelompok(selected).length;

  function toggle(group: KelompokIndikator) {
    const next = new Set(selected);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    onChange(next);
  }

  return (
    <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 sm:p-4" aria-labelledby="filter-aspek-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 id="filter-aspek-title" className="flex items-center gap-2 text-sm font-bold text-slate-800"><ListFilter className="h-4 w-4 text-indigo-600" /> Pilih kelompok data</h3>
          <p className="mt-1 text-xs text-slate-500">Nomor KK, NIK, dan nama selalu tampil di sisi kiri.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-sm">{activeColumns} kolom aktif</span>
          <button type="button" onClick={() => onChange(new Set(KELOMPOK_ORDER))} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"><CheckCheck className="h-3.5 w-3.5" /> Pilih semua</button>
          <button type="button" onClick={() => onChange(new Set())} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw className="h-3.5 w-3.5" /> Bersihkan</button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {KELOMPOK_ORDER.map((group) => (
          <label key={group} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${selected.has(group) ? "border-indigo-300 bg-white text-indigo-800 shadow-sm" : "border-slate-200 bg-white/60 text-slate-600 hover:bg-white"}`}>
            <input type="checkbox" checked={selected.has(group)} onChange={() => toggle(group)} className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="min-w-0"><span className="block font-semibold leading-tight">{KELOMPOK_LABEL[group]}</span><span className="mt-0.5 block text-[11px] text-slate-400">{GROUPED[group].length} kolom</span></span>
          </label>
        ))}
      </div>
    </section>
  );
}
