"use client";

import { useEffect, useState } from "react";
import { periodOptionLabel } from "@/lib/period-label";

type Period = {
  kode: string;
  label: string | null;
  jumlah: number;
  createdAt?: string;
  urutan?: number;
};

export function PeriodExportControls() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/snapshot")
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error ?? "Daftar periode tidak dapat dimuat");
        return (json.data ?? []) as Period[];
      })
      .then((data) => {
        if (!active) return;
        setPeriods(data);
        setSelected(data.at(-1)?.kode ?? "");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Daftar periode tidak dapat dimuat");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const disabled = loading || !selected;
  const href = (format: "csv" | "xlsx") =>
    selected ? `/api/snapshot/${encodeURIComponent(selected)}/export?format=${format}` : "#";
  const inactiveClass = "pointer-events-none cursor-not-allowed opacity-50";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
        <label className="min-w-0 text-xs font-medium text-slate-500 sm:min-w-80">
          Versi data
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            disabled={loading || periods.length === 0}
            className="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            {loading ? <option>Memuat versi data...</option> : null}
            {!loading && periods.length === 0 ? <option>Belum ada versi data</option> : null}
            {periods.map((period) => (
              <option key={period.kode} value={period.kode}>
                {periodOptionLabel(period)}
              </option>
            ))}
          </select>
        </label>
        {/* File downloads, not app navigation — <Link> isn't appropriate here. */}
        <a
          href={href("csv")}
          onClick={disabled ? (event) => event.preventDefault() : undefined}
          aria-disabled={disabled}
          className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 ${disabled ? inactiveClass : ""}`}
        >
          Ekspor CSV
        </a>
        <a
          href={href("xlsx")}
          onClick={disabled ? (event) => event.preventDefault() : undefined}
          aria-disabled={disabled}
          className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 ${disabled ? inactiveClass : ""}`}
        >
          Ekspor Excel (.xlsx)
        </a>
      </div>
      {error ? <p role="alert" className="text-xs font-medium text-red-600">{error}</p> : null}
      {!loading && !error && periods.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Belum ada versi data yang dapat diunduh. Impor data awal atau terapkan perubahan terlebih dahulu.
        </p>
      ) : null}
    </div>
  );
}
