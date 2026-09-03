"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, FileSpreadsheet, FileText, Pencil } from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  operationalColumnsForKelompok,
  KELOMPOK_ORDER,
  mapping,
  type KelompokIndikator,
} from "@/lib/indikator";
import { formatCell } from "@/lib/format";
import { AspectFilterPanel } from "./AspectFilterPanel";
import { DeleteButton } from "./DeleteButton";
import { useCanWrite } from "@/components/providers/AuthInfo";
import { AddDataMenu } from "./AddDataMenu";
import { fieldLabel } from "@/lib/field-labels";

type Row = Record<string, unknown> & { id: string };
type Facets = { dusun: string[]; rw: number[]; rt: number[] };

const columnHelper = createColumnHelper<Row>();

const STICKY_CORE: Record<string, { left: number; width: number }> = {
  nkk: { left: 0, width: 160 },
  nik: { left: 160, width: 160 },
  nama: { left: 320, width: 220 },
};

export function PendudukTable({
  initialAspects,
  initialQuery = "",
}: {
  initialAspects: KelompokIndikator[];
  initialQuery?: string;
}) {
  const canWrite = useCanWrite();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [search, setSearch] = useState(initialQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQuery);
  const [dusun, setDusun] = useState("");
  const [rw, setRw] = useState("");
  const [rt, setRt] = useState("");
  const [jk, setJk] = useState("");
  const [miskinBps, setMiskinBps] = useState("");
  const [facets, setFacets] = useState<Facets>({ dusun: [], rw: [], rt: [] });
  const [selectedAspects, setSelectedAspects] = useState<Set<KelompokIndikator>>(() => new Set(initialAspects));
  // ABS ID dan Jenis Subjek tetap dipakai untuk integrasi, tetapi tidak
  // membebani layar kerja operator.
  const visible = useMemo(() => operationalColumnsForKelompok(selectedAspects), [selectedAspects]);

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setPageSize(10);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetch("/api/penduduk/facets")
      .then((r) => r.json())
      .then(setFacets)
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", String(pageIndex + 1));
    params.set("pageSize", String(pageSize));
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (dusun) params.set("dusun", dusun);
    if (rw) params.set("rw", rw);
    if (rt) params.set("rt", rt);
    if (jk) params.set("jk", jk);
    if (miskinBps) params.set("miskin_bps", miskinBps);
    if (sorting[0]) {
      params.set("sortBy", sorting[0].id);
      params.set("sortDir", sorting[0].desc ? "desc" : "asc");
    }
    params.set("aspek", KELOMPOK_ORDER.filter((group) => selectedAspects.has(group)).join(","));

    try {
      const res = await fetch(`/api/penduduk?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat data");
      const json = await res.json();
      setRows(json.data);
      setTotal(json.pagination.total);
      setTotalPages(json.pagination.totalPages);
    } catch {
      setError("Gagal memuat data. Coba muat ulang halaman.");
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, debouncedSearch, dusun, rw, rt, jk, miskinBps, sorting, selectedAspects]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedSearch, dusun, rw, rt, jk, miskinBps]);

  const columns = useMemo(() => {
    const cols: ColumnDef<Row, unknown>[] = visible.map((name) =>
      columnHelper.accessor((row) => row[name], {
        id: name,
        header: fieldLabel(name, mapping.kolom[name]),
        cell: (info) => name === "nama" ? (
          <Link
            href={`/penduduk/${info.row.original.id}`}
            className="inline-flex items-center gap-1.5 font-semibold text-indigo-700 hover:underline"
            title={`Buka detail ${String(info.row.original.nama ?? "penduduk")}`}
          >
            {formatCell(info.getValue(), mapping.kolom[name])}
            <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </Link>
        ) : formatCell(info.getValue(), mapping.kolom[name]),
        enableSorting: true,
      })
    );
    cols.push(
      columnHelper.display({
        id: "_actions",
        header: "Aksi",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1 whitespace-nowrap">
            <Link
              href={`/penduduk/${row.original.id}`}
              title="Lihat detail"
              aria-label={`Lihat detail ${String(row.original.nama ?? "penduduk")}`}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              <Eye className="h-4 w-4" />
              Detail
            </Link>
            {canWrite && (
              <>
                <Link
                  href={`/penduduk/${row.original.id}/edit`}
                  title="Ubah data"
                  aria-label={`Ubah data ${String(row.original.nama ?? "penduduk")}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-amber-600 hover:bg-amber-50"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <DeleteButton id={row.original.id} nama={String(row.original.nama ?? "")} onDeleted={fetchData} />
              </>
            )}
          </div>
        ),
      })
    );
    return cols;
  }, [visible, fetchData, canWrite]);

  const exportQuery = useMemo(() => {
    const params = new URLSearchParams({
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
      ...(dusun ? { dusun } : {}),
      ...(rw ? { rw } : {}),
      ...(rt ? { rt } : {}),
      ...(jk ? { jk } : {}),
      ...(miskinBps ? { miskin_bps: miskinBps } : {}),
    });
    params.set("aspek", KELOMPOK_ORDER.filter((group) => selectedAspects.has(group)).join(","));
    return params.toString();
  }, [debouncedSearch, dusun, rw, rt, jk, miskinBps, selectedAspects]);

  function changeAspects(next: Set<KelompokIndikator>) {
    const normalized = new Set(KELOMPOK_ORDER.filter((group) => next.has(group)));
    setSelectedAspects(normalized);
    setPageIndex(0);
    const url = new URL(window.location.href);
    url.searchParams.set("aspek", [...normalized].join(","));
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  // TanStack Table intentionally exposes non-memoizable callbacks.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, pagination: { pageIndex, pageSize } },
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
    onSortingChange: (updater) => {
      setSorting((old) => {
        const next = typeof updater === "function" ? updater(old) : updater;
        return next.length ? [next[0]] : [];
      });
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <AspectFilterPanel selected={selectedAspects} onChange={changeAspects} />
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, NIK, NKK, alamat..."
          className="min-h-10 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:w-56"
        />
        <select value={dusun} onChange={(e) => setDusun(e.target.value)} className="min-h-10 max-w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
          <option value="">Semua Dusun</option>
          {facets.dusun.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={rw} onChange={(e) => setRw(e.target.value)} className="min-h-10 rounded-lg border border-slate-300 px-2 py-2 text-sm">
          <option value="">Semua RW</option>
          {facets.rw.map((v) => (
            <option key={v} value={v}>RW {v}</option>
          ))}
        </select>
        <select value={rt} onChange={(e) => setRt(e.target.value)} className="min-h-10 rounded-lg border border-slate-300 px-2 py-2 text-sm">
          <option value="">Semua RT</option>
          {facets.rt.map((v) => (
            <option key={v} value={v}>RT {v}</option>
          ))}
        </select>
        <select value={jk} onChange={(e) => setJk(e.target.value)} className="min-h-10 rounded-lg border border-slate-300 px-2 py-2 text-sm">
          <option value="">Semua Jenis Kelamin</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
        <select value={miskinBps} onChange={(e) => setMiskinBps(e.target.value)} className="min-h-10 rounded-lg border border-slate-300 px-2 py-2 text-sm">
          <option value="">Semua Status Kemiskinan</option>
          <option value="true">Miskin (BPS)</option>
          <option value="false">Tidak Miskin</option>
        </select>
        <div className="ml-auto flex flex-wrap items-center gap-2 max-sm:ml-0 max-sm:w-full">
          <a
            href={`/api/penduduk/export?${exportQuery}&format=xlsx`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </a>
          <a
            href={`/api/penduduk/export?${exportQuery}&format=csv`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" /> CSV
          </a>
          {canWrite ? <AddDataMenu /> : null}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      <p className="text-xs text-slate-500">
        <span className="md:hidden">Ketuk tombol <strong>Detail</strong> pada kartu warga untuk membuka data keluarga dan bangunan.</span>
        <span className="hidden md:inline">Klik <strong>nama warga</strong> atau tombol <strong>Detail</strong> di sisi kanan tabel untuk membuka seluruh data warga, keluarga, serta tautan foto bangunannya.</span>
      </p>

      <div className="grid gap-3 md:hidden">
        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-8 text-center text-sm text-slate-400">Memuat data...</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-8 text-center text-sm text-slate-400">Tidak ada data.</div>
        ) : rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words font-bold text-slate-900">{formatCell(row.nama, mapping.kolom.nama)}</h3>
                <p className="mt-1 break-all text-xs text-slate-500">NIK {formatCell(row.nik, mapping.kolom.nik)}</p>
              </div>
              <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{formatCell(row.jk, mapping.kolom.jk)}</span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
              <div className="col-span-2 min-w-0"><dt className="font-semibold uppercase tracking-wide text-slate-400">Nomor KK</dt><dd className="mt-1 break-all font-medium text-slate-700">{formatCell(row.nkk, mapping.kolom.nkk)}</dd></div>
              <div><dt className="font-semibold uppercase tracking-wide text-slate-400">Dusun</dt><dd className="mt-1 break-words font-medium text-slate-700">{formatCell(row.dusun, mapping.kolom.dusun)}</dd></div>
              <div><dt className="font-semibold uppercase tracking-wide text-slate-400">RW / RT</dt><dd className="mt-1 font-medium text-slate-700">{formatCell(row.rw, mapping.kolom.rw)} / {formatCell(row.rt, mapping.kolom.rt)}</dd></div>
            </dl>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <Link href={`/penduduk/${row.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"><Eye className="h-4 w-4" /> Detail</Link>
              {canWrite ? <Link href={`/penduduk/${row.id}/edit`} aria-label={`Ubah data ${String(row.nama ?? "penduduk")}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700"><Pencil className="h-4 w-4" /> Ubah</Link> : null}
              {canWrite ? <DeleteButton id={row.id} nama={String(row.nama ?? "")} onDeleted={fetchData} /> : null}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden max-h-[min(66vh,680px)] overscroll-contain overflow-auto rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:block">
        <table className="w-max min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const sticky = STICKY_CORE[header.column.id];
                  const actions = header.column.id === "_actions";
                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                      style={sticky ? { left: sticky.left, width: sticky.width, minWidth: sticky.width, maxWidth: sticky.width } : actions ? { right: 0, minWidth: 150 } : undefined}
                      className={`sticky top-0 z-20 px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap select-none bg-slate-50 ${header.column.getCanSort() ? "cursor-pointer" : ""} ${sticky ? "z-30 shadow-[1px_0_0_#e2e8f0]" : ""} ${actions ? "z-40 text-right shadow-[-1px_0_0_#e2e8f0] max-sm:hidden" : ""}`}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" && " ▲"}
                      {header.column.getIsSorted() === "desc" && " ▼"}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-400">
                  Memuat data...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-400">
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  {row.getVisibleCells().map((cell) => {
                    const sticky = STICKY_CORE[cell.column.id];
                    const actions = cell.column.id === "_actions";
                    return (
                      <td
                        key={cell.id}
                        style={sticky ? { left: sticky.left, width: sticky.width, minWidth: sticky.width, maxWidth: sticky.width } : actions ? { right: 0, minWidth: 150 } : undefined}
                        className={`px-3 py-2 whitespace-nowrap text-slate-700 ${sticky ? "sticky z-10 overflow-hidden text-ellipsis bg-white shadow-[1px_0_0_#e2e8f0] group-hover:bg-slate-50" : ""} ${actions ? "sticky z-20 bg-white shadow-[-1px_0_0_#e2e8f0] group-hover:bg-slate-50 max-sm:hidden" : ""}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Total {total} data — halaman {pageIndex + 1} dari {totalPages}
        </span>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <select
            value={pageSize}
            aria-label="Jumlah data setiap halaman"
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPageIndex(0);
            }}
            className="col-span-2 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 sm:col-span-1 sm:w-auto"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / halaman</option>
            ))}
          </select>
          <button
            type="button"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            className="min-h-10 rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <button
            type="button"
            disabled={pageIndex + 1 >= totalPages}
            onClick={() => setPageIndex((p) => p + 1)}
            className="min-h-10 rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}
