"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import { mapping, DEFAULT_VISIBLE_COLUMNS } from "@/lib/indikator";
import { formatCell } from "@/lib/format";
import { ColumnToggle } from "./ColumnToggle";
import { DeleteButton } from "./DeleteButton";

type Row = Record<string, unknown> & { id: string };
type Facets = { dusun: string[]; rw: string[]; rt: string[] };

const columnHelper = createColumnHelper<Row>();

export function PendudukTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dusun, setDusun] = useState("");
  const [rw, setRw] = useState("");
  const [rt, setRt] = useState("");
  const [jk, setJk] = useState("");
  const [miskinBps, setMiskinBps] = useState("");
  const [facets, setFacets] = useState<Facets>({ dusun: [], rw: [], rt: [] });
  const [visible, setVisible] = useState<Set<string>>(new Set(DEFAULT_VISIBLE_COLUMNS));

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
    params.set("columns", [...visible].join(","));

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
  }, [pageIndex, pageSize, debouncedSearch, dusun, rw, rt, jk, miskinBps, sorting, visible]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedSearch, dusun, rw, rt, jk, miskinBps]);

  const columns = useMemo(() => {
    const cols: ColumnDef<Row, unknown>[] = [...visible].map((name) =>
      columnHelper.accessor((row) => row[name], {
        id: name,
        header: mapping.kolom[name]?.label ?? name,
        cell: (info) => formatCell(info.getValue(), mapping.kolom[name]),
        enableSorting: true,
      })
    );
    cols.push(
      columnHelper.display({
        id: "_actions",
        header: "Aksi",
        cell: ({ row }) => (
          <div className="flex items-center gap-3 whitespace-nowrap">
            <Link href={`/penduduk/${row.original.id}`} className="text-sm font-medium text-blue-600 hover:underline">
              Lihat
            </Link>
            <Link href={`/penduduk/${row.original.id}/edit`} className="text-sm font-medium text-amber-600 hover:underline">
              Ubah
            </Link>
            <DeleteButton id={row.original.id} nama={String(row.original.nama ?? "")} onDeleted={fetchData} />
          </div>
        ),
      })
    );
    return cols;
  }, [visible, fetchData]);

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
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, NIK, NKK, alamat..."
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select value={dusun} onChange={(e) => setDusun(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
          <option value="">Semua Dusun</option>
          {facets.dusun.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={rw} onChange={(e) => setRw(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
          <option value="">Semua RW</option>
          {facets.rw.map((v) => (
            <option key={v} value={v}>RW {v}</option>
          ))}
        </select>
        <select value={rt} onChange={(e) => setRt(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
          <option value="">Semua RT</option>
          {facets.rt.map((v) => (
            <option key={v} value={v}>RT {v}</option>
          ))}
        </select>
        <select value={jk} onChange={(e) => setJk(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
          <option value="">Semua Jenis Kelamin</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
        <select value={miskinBps} onChange={(e) => setMiskinBps(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
          <option value="">Semua Status Kemiskinan</option>
          <option value="true">Miskin (BPS)</option>
          <option value="false">Tidak Miskin</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          <ColumnToggle visible={visible} onChange={setVisible} />
          <a
            href={`/api/penduduk/export?${new URLSearchParams({
              ...(debouncedSearch ? { q: debouncedSearch } : {}),
              ...(dusun ? { dusun } : {}),
              ...(rw ? { rw } : {}),
              ...(rt ? { rt } : {}),
              ...(jk ? { jk } : {}),
              ...(miskinBps ? { miskin_bps: miskinBps } : {}),
              format: "xlsx",
            }).toString()}`}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Ekspor
          </a>
          <Link
            href="/penduduk/baru"
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Tambah Data
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                    className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap cursor-pointer select-none"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc" && " ▲"}
                    {header.column.getIsSorted() === "desc" && " ▼"}
                  </th>
                ))}
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
                <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 whitespace-nowrap text-slate-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm text-slate-600">
        <span>
          Total {total} data — halaman {pageIndex + 1} dari {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPageIndex(0);
            }}
            className="rounded-lg border border-slate-300 px-2 py-1"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / halaman</option>
            ))}
          </select>
          <button
            type="button"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <button
            type="button"
            disabled={pageIndex + 1 >= totalPages}
            onClick={() => setPageIndex((p) => p + 1)}
            className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}
