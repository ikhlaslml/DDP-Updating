"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2 } from "lucide-react";
import { fieldLabel } from "@/lib/field-labels";
import { mapping } from "@/lib/indikator";

type Summary = {
  trackedFields: number;
  dueFields: number;
  dueFamilies: number;
  dueMembers: number;
  topFields: { field: string; count: number }[];
};
type Response = {
  familyCount: number;
  residentCount: number;
  sixMonths: Summary;
  annual: Summary;
};

export function UpdatingReminder() {
  const [data, setData] = useState<Response | null>(null);
  useEffect(() => {
    fetch("/api/updating/reminders")
      .then((response) => (response.ok ? response.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);
  if (!data) return null;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pengingat Pembaruan Data</h2>
            <p className="mt-1 text-xs text-slate-500">
              Ditata per keluarga agar jawaban rumah tangga cukup diperbarui satu kali.
            </p>
          </div>
        </div>
        <Link
          href="/penduduk/pembaruan-berkala"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Buka pembaruan berkala <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {[
          ["6 Bulan", "6-bulan", data.sixMonths],
          ["1 Tahun", "1-tahun", data.annual],
        ].map(([label, slug, raw]) => {
          const summary = raw as Summary;
          const clear = summary.dueFields === 0;
          return (
            <Link
              key={slug as string}
              href={`/penduduk/pembaruan-berkala?siklus=${slug}`}
              className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${
                clear ? "border-emerald-100 bg-emerald-50" : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Siklus {label as string}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {summary.dueFamilies}{" "}
                    <span className="text-sm font-medium text-slate-500">keluarga perlu ditinjau</span>
                  </p>
                </div>
                {clear ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <CalendarClock className="h-6 w-6 text-amber-600" />
                )}
              </div>
              <p className="mt-2 text-xs text-slate-600">
                {summary.trackedFields} parameter · {summary.dueMembers} anggota ·{" "}
                {summary.dueFields} isian jatuh tempo
              </p>
              {summary.topFields.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {summary.topFields.map((item) => (
                    <span key={item.field} className="rounded-full bg-white/80 px-2 py-1 text-[11px] text-slate-700">
                      {fieldLabel(item.field, mapping.kolom[item.field])}: {item.count}
                    </span>
                  ))}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
