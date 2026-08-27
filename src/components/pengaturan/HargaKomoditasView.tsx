"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, History, LoaderCircle, Save } from "lucide-react";
import { useCanWrite } from "@/components/providers/AuthInfo";

type CommodityRow = {
  id: string;
  kode: string;
  kategori: string;
  nama: string;
  satuan: string;
  urutan: number;
  harga: string;
  sumberData: string;
  updatedAt: string | null;
  hargaTerakhir: string | null;
  periodeTerakhir: string | null;
  tanggalPembaruanTerakhir: string | null;
};

type HistoryRow = {
  id: string;
  komoditasId: string;
  periode: string;
  harga: string;
  sumberData: string;
  updatedByName: string | null;
  updatedAt: string;
};

const WORKBOOK_HEADERS = ["No", "Nama Pangan", "Satuan", "Harga Per Satuan (Rp)"];

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function rupiah(value: string | null) {
  if (value === null || value === "") return "Belum ada";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 }).format(Number(value));
}

function parseImportedPrice(raw: unknown) {
  if (typeof raw === "number") return raw;
  const source = String(raw ?? "").trim();
  if (!source) return null;
  let normalized = source.replace(/rp/gi, "").replace(/\s/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = normalized.replace(",", ".");
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) throw new Error(`Nilai harga "${source}" tidak valid.`);
  return value;
}

export function HargaKomoditasView() {
  const canWrite = useCanWrite();
  const [periode, setPeriode] = useState(currentPeriod);
  const [source, setSource] = useState("");
  const [rows, setRows] = useState<CommodityRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [historyCommodityId, setHistoryCommodityId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (selectedPeriod: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/harga-komoditas?periode=${encodeURIComponent(selectedPeriod)}`);
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Data harga tidak dapat dimuat.");
      const data = (json.data ?? []) as CommodityRow[];
      setRows(data);
      setHistory((json.history ?? []) as HistoryRow[]);
      setValues(Object.fromEntries(data.map((row) => [row.id, row.harga])));
      setSource(data.find((row) => row.sumberData)?.sumberData ?? "");
      setHistoryCommodityId((current) => current || data[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Data harga tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(periode), 0);
    return () => window.clearTimeout(timer);
  }, [load, periode]);

  const selectedHistory = useMemo(
    () => history.filter((item) => item.komoditasId === historyCommodityId),
    [history, historyCommodityId]
  );
  const filledCount = Object.values(values).filter((value) => value.trim() !== "").length;

  async function saveAll() {
    setError("");
    setMessage("");
    const submitted: { komoditasId: string; harga: number }[] = [];
    for (const row of rows) {
      const raw = values[row.id]?.trim();
      if (!raw) continue;
      const harga = Number(raw);
      if (!Number.isFinite(harga) || harga < 0) {
        setError(`Harga ${row.nama} harus berupa angka positif.`);
        return;
      }
      submitted.push({ komoditasId: row.id, harga });
    }
    if (!submitted.length) {
      setError("Isi setidaknya satu harga sebelum menyimpan.");
      return;
    }
    if (source.trim().length < 2) {
      setError("Sumber data wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/harga-komoditas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periode, sumberData: source, rows: submitted }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Harga gagal disimpan.");
      setMessage(`${json.data.count} harga periode ${periode} berhasil disimpan.`);
      await load(periode);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Harga gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function importWorkbook(file: File, input: HTMLInputElement) {
    setError("");
    setMessage("");
    try {
      if (!file.name.toLocaleLowerCase("en-US").endsWith(".xlsx")) throw new Error("Format borang harus XLSX.");
      if (!file.size || file.size > 2_000_000) throw new Error("Ukuran borang maksimal 2 MB.");
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer() as never);
      const firstSheet = workbook.worksheets[0];
      if (!firstSheet) throw new Error("Berkas Excel tidak memiliki sheet.");
      if (firstSheet.rowCount > 100 || firstSheet.columnCount > 10) throw new Error("Borang melebihi batas ukuran yang diizinkan.");
      const matrix: unknown[][] = [];
      for (let rowNumber = 1; rowNumber <= firstSheet.rowCount; rowNumber += 1) {
        const cells: unknown[] = [];
        for (let column = 1; column <= firstSheet.columnCount; column += 1) {
          const cell = firstSheet.getRow(rowNumber).getCell(column);
          const value = cell.value;
          cells.push(value && typeof value === "object" && "result" in value ? value.result : typeof value === "object" ? cell.text : value ?? "");
        }
        matrix.push(cells);
      }
      const headerIndex = matrix.findIndex((row) => row.some((cell) => String(cell).trim() !== ""));
      if (headerIndex < 0) throw new Error("Sheet Excel kosong.");
      const headers = matrix[headerIndex].slice(0, 4).map((cell) => String(cell).trim());
      if (headers.some((header, index) => header !== WORKBOOK_HEADERS[index])) {
        throw new Error("Header Excel harus: No, Nama Pangan, Satuan, Harga Per Satuan (Rp).");
      }
      const importedRows = matrix.slice(headerIndex + 1).filter((row) => row.some((cell) => String(cell).trim() !== ""));
      if (importedRows.length !== rows.length) {
        throw new Error(`Borang harus memuat ${rows.length} komoditas; ditemukan ${importedRows.length}.`);
      }
      const next: Record<string, string> = {};
      rows.forEach((catalog, index) => {
        const imported = importedRows[index];
        const no = Number(imported[0]);
        const name = String(imported[1] ?? "").trim();
        const unit = String(imported[2] ?? "").trim();
        if (no !== catalog.urutan || name !== catalog.nama || unit !== catalog.satuan) {
          throw new Error(`Baris ${index + 1} tidak cocok dengan master: ${catalog.nama} (${catalog.satuan}).`);
        }
        const price = parseImportedPrice(imported[3]);
        next[catalog.id] = price === null ? "" : String(price);
      });
      setValues(next);
      setMessage(`Borang ${file.name} berhasil dibaca. Periksa lalu simpan ${Object.values(next).filter(Boolean).length} harga.`);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Borang tidak dapat dibaca.");
    } finally {
      input.value = "";
    }
  }

  async function exportWorkbook() {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "DDP Updating";
    const sheet = workbook.addWorksheet("Sheet1");
    sheet.addRow([]);
    sheet.addRow(["No", "Nama Pangan", "Satuan ", "Harga Per Satuan (Rp) "]);
    rows.forEach((row) => sheet.addRow([row.urutan, row.nama, row.satuan, values[row.id] === "" ? null : Number(values[row.id])]));
    sheet.columns = [{ width: 6 }, { width: 28 }, { width: 14 }, { width: 24 }];
    sheet.getRow(2).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([new Uint8Array(buffer as ArrayBuffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Borang-Harga-${periode}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Harga Komoditas Desa</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">Master 45 komoditas dan satuan mengikuti Borang Harga.xlsx. Harga disimpan per desa dan periode agar riwayat tidak saling menimpa.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canWrite ? (
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <FileSpreadsheet className="h-4 w-4" /> Impor Excel
                <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) void importWorkbook(file, event.currentTarget);
                }} />
              </label>
            ) : null}
            <button type="button" disabled={!rows.length} onClick={() => void exportWorkbook()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <Download className="h-4 w-4" /> Ekspor Excel
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[12rem_1fr_auto]">
          <label className="text-xs font-medium text-slate-600">Periode pencatatan
            <input type="month" value={periode} onChange={(event) => { setPeriode(event.target.value); setMessage(""); }} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-medium text-slate-600">Sumber data
            <input value={source} onChange={(event) => setSource(event.target.value)} disabled={!canWrite} placeholder="Contoh: Survei pasar desa" maxLength={200} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50" />
          </label>
          <div className="flex items-end">
            {canWrite ? <button type="button" disabled={saving || loading} onClick={() => void saveAll()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 lg:w-auto">
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan Massal ({filledCount})
            </button> : <span className="text-xs text-slate-400">Mode lihat; hanya operator yang dapat mengubah harga.</span>}
          </div>
        </div>
        {message ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
          <h3 className="font-bold text-slate-900">Tabel Harga Periode {periode}</h3>
          <span className="text-xs text-slate-500">{filledCount} dari {rows.length} harga terisi</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">No</th><th className="px-4 py-3">Komoditas</th><th className="px-4 py-3">Satuan</th><th className="px-4 py-3">Harga periode ini</th><th className="px-4 py-3">Harga terakhir tersimpan</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={5} className="px-4 py-16 text-center text-slate-400"><LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" />Memuat harga...</td></tr> : rows.map((row, index) => (
                <Fragment key={row.id}>
                  {index === 0 || rows[index - 1].kategori !== row.kategori ? <tr className="bg-indigo-50/70"><th colSpan={5} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-indigo-700">{row.kategori}</th></tr> : null}
                  <tr className="align-top hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-500">{row.urutan}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.nama}</td>
                    <td className="px-4 py-3 text-slate-600">{row.satuan}</td>
                    <td className="px-4 py-2">
                      <div className="relative w-48"><span className="pointer-events-none absolute left-3 top-2.5 text-xs text-slate-400">Rp</span><input type="number" inputMode="decimal" min="0" step="0.01" value={values[row.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [row.id]: event.target.value }))} disabled={!canWrite} aria-label={`Harga ${row.nama}`} className="min-h-10 w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-right tabular-nums disabled:bg-slate-50" /></div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <p className="font-semibold text-slate-800">{rupiah(row.hargaTerakhir)}</p>
                      {row.periodeTerakhir ? <p>{row.periodeTerakhir} · {row.tanggalPembaruanTerakhir ? new Date(row.tanggalPembaruanTerakhir).toLocaleDateString("id-ID") : "-"}</p> : <p>Belum pernah diperbarui</p>}
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h3 className="flex items-center gap-2 font-bold text-slate-900"><History className="h-4 w-4" /> Riwayat Antarperiode</h3><p className="mt-1 text-sm text-slate-500">Perubahan harga tersimpan sebagai record periode terpisah.</p></div>
          <label className="text-xs font-medium text-slate-600">Komoditas
            <select value={historyCommodityId} onChange={(event) => setHistoryCommodityId(event.target.value)} className="mt-1 block min-h-10 min-w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {rows.map((row) => <option key={row.id} value={row.id}>{row.nama} ({row.satuan})</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[620px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Periode</th><th className="px-3 py-2">Harga</th><th className="px-3 py-2">Sumber</th><th className="px-3 py-2">Diperbarui</th></tr></thead><tbody className="divide-y divide-slate-100">
            {selectedHistory.length ? selectedHistory.map((item) => <tr key={item.id}><td className="px-3 py-2 font-medium">{item.periode}</td><td className="px-3 py-2">{rupiah(item.harga)}</td><td className="px-3 py-2">{item.sumberData}</td><td className="px-3 py-2 text-xs text-slate-500">{new Date(item.updatedAt).toLocaleString("id-ID")}<br />{item.updatedByName ?? "Operator"}</td></tr>) : <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-400">Belum ada riwayat harga untuk komoditas ini.</td></tr>}
          </tbody></table>
        </div>
      </section>
    </div>
  );
}
