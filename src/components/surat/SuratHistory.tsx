"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Download, Printer, Search } from "lucide-react";

type Template = { id: string; nama: string };
type LetterRow = {
  id: string;
  nomor: string;
  templateNama: string | null;
  namaWarga: string | null;
  nik: string | null;
  keperluan: string | null;
  issuedByName: string | null;
  createdAt: string;
};

export function SuratHistory({ templates }: { templates: Template[] }) {
  const [rows, setRows] = useState<LetterRow[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedQuery(query.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: "10" });
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (templateId) params.set("templateId", templateId);
    try {
      const response = await fetch(`/api/surat?${params}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Riwayat gagal dimuat.");
      setRows(json.data ?? []);
      setTotal(json.pagination?.total ?? 0);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Riwayat gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, debouncedQuery, page, templateId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function clearFilters() {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setTemplateId("");
    setPage(1);
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-bold text-slate-900">Riwayat Layanan Surat</h2></div>
        <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700">{total} surat</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="relative sm:col-span-2 xl:col-span-2"><span className="sr-only">Cari riwayat surat</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nomor, nama, NIK, atau keperluan..." className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm" /></label>
        <label className="relative"><span className="mb-1 block text-xs font-semibold text-slate-500">Dari tanggal</span><CalendarDays className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-slate-400" /><input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm" /></label>
        <label className="relative"><span className="mb-1 block text-xs font-semibold text-slate-500">Sampai tanggal</span><CalendarDays className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-slate-400" /><input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm" /></label>
        <label><span className="mb-1 block text-xs font-semibold text-slate-500">Jenis surat</span><select value={templateId} onChange={(event) => { setTemplateId(event.target.value); setPage(1); }} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">Semua jenis</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.nama}</option>)}</select></label>
      </div>
      {(query || dateFrom || dateTo || templateId) ? <button type="button" onClick={clearFilters} className="mt-3 text-xs font-semibold text-indigo-600 hover:underline">Bersihkan filter</button> : null}

      {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500"><tr><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Nomor / Jenis</th><th className="px-4 py-3">Penduduk</th><th className="px-4 py-3">Keperluan</th><th className="px-4 py-3">Penerbit</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Memuat riwayat...</td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Tidak ada surat yang sesuai filter.</td></tr> : rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-4 py-3">{new Date(row.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}<br /><span className="text-xs text-slate-400">{new Date(row.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span></td>
                <td className="px-4 py-3"><p className="font-semibold text-slate-900">{row.nomor}</p><p className="text-xs text-slate-500">{row.templateNama ?? "Surat"}</p></td>
                <td className="px-4 py-3"><p className="font-semibold text-slate-800">{row.namaWarga ?? "-"}</p><p className="text-xs text-slate-500">NIK {row.nik ?? "-"}</p></td>
                <td className="max-w-56 px-4 py-3 text-slate-600">{row.keperluan || "-"}</td>
                <td className="px-4 py-3 text-slate-600">{row.issuedByName || "Data lama"}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => window.open(`/api/surat/${row.id}/pdf?mode=inline`, "_blank", "noopener,noreferrer")} title="Cetak ulang" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50"><Printer className="h-4 w-4" /></button><a href={`/api/surat/${row.id}/pdf`} title="Unduh ulang PDF" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50"><Download className="h-4 w-4" /></a></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600"><span>Halaman {page} dari {totalPages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40">Sebelumnya</button><button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40">Berikutnya</button></div></div>
    </section>
  );
}
