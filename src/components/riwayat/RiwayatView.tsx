"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCell } from "@/lib/format";
import { mapping } from "@/lib/indikator";

type Periode = { id: string; kode: string; label: string | null; jumlah: number; createdAt: string };
type Row = Record<string, unknown>;

const COLS: { key: string; label: string }[] = [
  { key: "nkk", label: "No. KK" },
  { key: "nik", label: "NIK" },
  { key: "nama", label: "Nama Lengkap" },
  { key: "jk", label: "JK" },
  { key: "dusun", label: "Dusun" },
  { key: "tgl_lahir", label: "Tgl Lahir" },
  { key: "alamat", label: "Alamat" },
];

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
  const [snapDate, setSnapDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => setPage(1), [debounced, selected]);

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
      setSnapDate(json.snapshot?.createdAt ?? null);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selected, page, pageSize, debounced]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Riwayat Data Kependudukan</h2>
          {snapDate && (
            <p className="mt-1 text-xs text-slate-500">
              Snapshot tanggal: {new Date(snapDate).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
        <div className="flex items-end gap-3">
          <label className="text-xs font-medium text-slate-500">
            Pilih Periode Data
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
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
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Export Excel
            </a>
          )}
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cari nama / NIK / NKK..."
        className="mt-4 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

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

      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
        <span>Total {total} — halaman {page} dari {totalPages}</span>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-2 py-1"
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>{n} / halaman</option>
            ))}
          </select>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </section>
  );
}
