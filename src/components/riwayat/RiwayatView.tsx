"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCell } from "@/lib/format";
import { mapping } from "@/lib/indikator";
import { fieldLabel } from "@/lib/field-labels";

type Periode = { id: string; kode: string; label: string | null; jumlah: number; createdAt: string };
type Row = Record<string, unknown>;
type SnapshotMeta = {
  createdAt: string;
  jumlahBangunan: number;
  changeCount: number;
  changeSummary: string | null;
  changeActors: {
    name: string;
    email: string | null;
    firstAt: string;
    lastAt: string;
    count: number;
  }[];
  createdByName: string | null;
  createdByEmail: string | null;
};
type FieldChange = { key: string; label: string; before: unknown; after: unknown };
type PeriodChange = {
  key: string;
  kind: "ADDED" | "REMOVED" | "UPDATED";
  nik: string | null;
  nkk: string | null;
  nama: string | null;
  fields: FieldChange[];
};
type ChangesResponse = {
  snapshot: { kode: string };
  previous: { kode: string } | null;
  summary: { total: number; added: number; removed: number; updated: number };
  data: PeriodChange[];
  pagination: { page: number; totalPages: number; total: number };
};

const COLS: { key: string; label: string }[] = ["nkk", "nik", "nama", "jk", "dusun", "tgl_lahir", "alamat"].map(
  (key) => ({ key, label: fieldLabel(key, mapping.kolom[key]) })
);

export function RiwayatView() {
  const [periods, setPeriods] = useState<Periode[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [snapshotMeta, setSnapshotMeta] = useState<SnapshotMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [changes, setChanges] = useState<ChangesResponse | null>(null);
  const [changesLoading, setChangesLoading] = useState(false);
  const [changesPage, setChangesPage] = useState(1);

  useEffect(() => {
    fetch("/api/snapshot")
      .then((r) => r.json())
      .then((json) => {
        const list: Periode[] = json.data ?? [];
        setPeriods(list);
        if (list.length) setSelected(list[list.length - 1].kode);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (debounced) params.set("q", debounced);
    try {
      const res = await fetch(`/api/snapshot/${selected}?${params}`);
      const json = await res.json();
      setRows(json.data ?? []);
      setTotal(json.pagination?.total ?? 0);
      setTotalPages(json.pagination?.totalPages ?? 1);
      setSnapshotMeta(json.snapshot ?? null);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selected, page, pageSize, debounced]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setChangesLoading(true);
      fetch(`/api/snapshot/${encodeURIComponent(selected)}/changes?page=${changesPage}&pageSize=20`)
        .then(async (response) => {
          const json = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(json.error ?? "Perubahan tidak dapat dimuat");
          return json as ChangesResponse;
        })
        .then((json) => { if (active) setChanges(json); })
        .catch(() => { if (active) setChanges(null); })
        .finally(() => { if (active) setChangesLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [selected, changesPage]);

  function formatChangedValue(field: FieldChange, value: unknown) {
    return formatCell(value, mapping.kolom[field.key]);
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Riwayat Data Kependudukan</h2>
          {snapshotMeta ? (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>
                Waktu: {new Date(snapshotMeta.createdAt).toLocaleString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZoneName: "short",
                })}
              </span>
              <span>
                Digabungkan oleh: <strong className="font-semibold text-slate-700">{snapshotMeta.createdByName ?? "Sistem"}</strong>
                {snapshotMeta.createdByEmail ? ` (${snapshotMeta.createdByEmail})` : ""}
              </span>
              <span>{snapshotMeta.changeCount} perubahan • {snapshotMeta.jumlahBangunan} bangunan</span>
            </div>
          ) : null}
          {snapshotMeta?.changeActors?.length ? (
            <p className="mt-1 text-xs text-slate-500">
              Diajukan oleh: {snapshotMeta.changeActors.map((actor) =>
                `${actor.name}${actor.email ? ` (${actor.email})` : ""} — ${actor.count} perubahan, ${new Date(actor.firstAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" })}`
              ).join("; ")}
            </p>
          ) : null}
          {snapshotMeta?.changeSummary ? <p className="mt-1 text-xs font-medium text-indigo-600">{snapshotMeta.changeSummary}</p> : null}
        </div>
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-end">
          <label className="text-xs font-medium text-slate-500">
            Pilih Periode Data
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setPage(1);
                setChangesPage(1);
              }}
              className="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            >
              {periods.map((p) => (
                <option key={p.kode} value={p.kode}>
                  {p.kode}
                  {p.label ? ` — ${p.label}` : ""} ({p.jumlah})
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <a
              href={`/api/snapshot/${selected}/export`}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
            >
              Export Excel
            </a>
          )}
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Cari nama / NIK / NKK..."
        className="mt-4 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <section className="mt-4 overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50/40">
        <div className="flex flex-col gap-2 border-b border-indigo-100 bg-white/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Perubahan pada Periode Ini</h3>
            {changes?.previous ? <p className="mt-0.5 text-xs text-slate-500">Dibandingkan dengan periode {changes.previous.kode}. Riwayat di bawah berasal dari snapshot yang sudah disimpan, bukan perubahan yang masih menunggu penggabungan.</p> : <p className="mt-0.5 text-xs text-slate-500">{selected ? "Ini adalah data awal; belum ada periode sebelumnya untuk dibandingkan." : "Pilih periode untuk melihat perubahan."}</p>}
          </div>
          {changes?.previous ? <div className="flex flex-wrap gap-1.5 text-xs font-semibold"><span className="rounded-full bg-white px-2 py-1 text-emerald-700">{changes.summary.added} ditambahkan</span><span className="rounded-full bg-white px-2 py-1 text-indigo-700">{changes.summary.updated} diperbarui</span><span className="rounded-full bg-white px-2 py-1 text-rose-700">{changes.summary.removed} tidak lagi ada</span></div> : null}
        </div>
        {changesLoading ? <p className="px-4 py-5 text-sm text-slate-500">Memuat perubahan...</p> : changes?.previous && changes.data.length ? (
          <>
            <div className="max-h-96 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-indigo-50 text-left text-xs font-semibold uppercase text-slate-500"><tr><th className="px-4 py-2">Warga</th><th className="px-4 py-2">Perubahan</th></tr></thead>
                <tbody>
                  {changes.data.map((change) => (
                    <tr key={change.key} className="border-t border-indigo-100/70 align-top">
                      <td className="min-w-48 px-4 py-3"><p className="font-semibold text-slate-800">{change.nama ?? "Tanpa nama"}</p><p className="mt-0.5 text-xs text-slate-500">NIK {change.nik ?? "-"}<br />No. KK {change.nkk ?? "-"}</p></td>
                      <td className="min-w-[28rem] px-4 py-3 text-slate-700">
                        {change.kind === "ADDED" ? <span className="font-medium text-emerald-700">Data warga baru ditambahkan pada periode ini.</span> : null}
                        {change.kind === "REMOVED" ? <span className="font-medium text-rose-700">Data warga tidak lagi berada pada baseline aktif periode ini.</span> : null}
                        {change.kind === "UPDATED" ? <ul className="space-y-1.5">{change.fields.map((field) => <li key={field.key} className="break-words"><strong>{field.label}:</strong> <span className="text-slate-500">{formatChangedValue(field, field.before)}</span> <span aria-hidden="true">→</span> <span className="font-medium text-slate-800">{formatChangedValue(field, field.after)}</span></li>)}</ul> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {changes.pagination.totalPages > 1 ? <div className="flex items-center justify-end gap-2 border-t border-indigo-100 px-4 py-2 text-xs"><button type="button" disabled={changes.pagination.page <= 1} onClick={() => setChangesPage((current) => Math.max(1, current - 1))} className="rounded border border-slate-300 bg-white px-2 py-1 disabled:opacity-40">Sebelumnya</button><span>Halaman {changes.pagination.page} dari {changes.pagination.totalPages}</span><button type="button" disabled={changes.pagination.page >= changes.pagination.totalPages} onClick={() => setChangesPage((current) => current + 1)} className="rounded border border-slate-300 bg-white px-2 py-1 disabled:opacity-40">Berikutnya</button></div> : null}
          </>
        ) : changes?.previous ? <p className="px-4 py-5 text-sm text-slate-500">Tidak ada perubahan data warga dibandingkan periode sebelumnya.</p> : null}
      </section>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              {COLS.map((c) => (
                <th key={c.key} className="px-3 py-2 whitespace-nowrap">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLS.length} className="px-3 py-6 text-center text-slate-400">Memuat...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={COLS.length} className="px-3 py-6 text-center text-slate-400">Tidak ada data.</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  {COLS.map((c) => (
                    <td key={c.key} className="px-3 py-2 whitespace-nowrap text-slate-700">
                      {formatCell(r[c.key], mapping.kolom[c.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>Total {total} — halaman {page} dari {totalPages}</span>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="col-span-2 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 sm:col-span-1 sm:w-auto"
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>{n} / halaman</option>
            ))}
          </select>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="min-h-10 rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="min-h-10 rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </section>
  );
}
