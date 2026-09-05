"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Activity, Building2, Clock3, Eye, UserRound, X } from "lucide-react";
import { formatCell } from "@/lib/format";
import { mapping } from "@/lib/indikator";
import { fieldLabel } from "@/lib/field-labels";
import { useCanWrite } from "@/components/providers/AuthInfo";

type StagingRow = {
  id: string;
  entityType: "PENDUDUK" | "BANGUNAN" | "PERISTIWA";
  eventType: string | null;
  groupId: string | null;
  aksi: "CREATE" | "UPDATE" | "DELETE" | "EVENT";
  ringkasan: string | null;
  createdAt: string;
  createdByName: string;
  createdByEmail: string | null;
  row: {
    kodeBangunan: number | null;
    jenisBangunan: string | null;
    kategoriBangunan: string | null;
    nkk: string | null;
    nik: string | null;
    nama: string | null;
    jk: string | null;
    dusun: string | null;
    tgl_lahir: string | null;
    alamat: string | null;
  };
};

type DetailRow = {
  id: string;
  entityType: "PENDUDUK" | "BANGUNAN" | "PERISTIWA";
  eventType: string | null;
  aksi: StagingRow["aksi"];
  ringkasan: string | null;
  createdAt: string;
  createdByName: string;
  createdByEmail: string | null;
  values: Record<string, unknown>;
};

type DetailResponse = { groupId: string | null; data: DetailRow[] };

const INTERNAL_FIELDS = new Set(["id", "desaId", "createdAt", "updatedAt", "fotoUrl", "polygon"]);
const BUILDING_LABELS: Record<string, string> = {
  kode: "Kode Bangunan",
  jenis: "Jenis Bangunan",
  kategori: "Kategori Bangunan",
  keterangan: "Nama/Jenis Spesifik",
  centroidLat: "Koordinat Lintang (Centroid)",
  centroidLng: "Koordinat Bujur (Centroid)",
  dusun: "Dusun/Kampung/Dukuh",
  rw: "Rukun Warga (RW)",
  rt: "Rukun Tetangga (RT)",
  alamat: "Alamat/Keterangan Lokasi",
  alasan: "Alasan Penghapusan",
  jumlahKk: "Jumlah KK Tetap Tersimpan",
  jumlahPenduduk: "Jumlah Penduduk Tetap Tersimpan",
};

function detailLabel(entityType: DetailRow["entityType"], key: string) {
  if (entityType === "BANGUNAN") return BUILDING_LABELS[key] ?? fieldLabel(key);
  return fieldLabel(key, mapping.kolom[key]);
}

function detailValue(key: string, value: unknown) {
  const definition = mapping.kolom[key];
  if (definition) return formatCell(value, definition);
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).replaceAll("_", " ");
}

function polygonPointCount(value: unknown) {
  if (typeof value !== "string") return 0;
  try {
    const polygon = JSON.parse(value) as { coordinates?: unknown };
    const ring = Array.isArray(polygon.coordinates) ? polygon.coordinates[0] : null;
    return Array.isArray(ring) ? Math.max(0, ring.length - 1) : 0;
  } catch {
    return 0;
  }
}

const STATUS_BADGE: Record<StagingRow["aksi"], { label: string; cls: string }> = {
  CREATE: { label: "BARU", cls: "bg-emerald-100 text-emerald-700" },
  UPDATE: { label: "DIUBAH", cls: "bg-amber-100 text-amber-700" },
  DELETE: { label: "DIHAPUS", cls: "bg-red-100 text-red-700" },
  EVENT: { label: "PERISTIWA", cls: "bg-sky-100 text-sky-700" },
};

export function PerubahanSementara() {
  const canWrite = useCanWrite();
  const [rows, setRows] = useState<StagingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [confirmMerge, setConfirmMerge] = useState(false);
  const [details, setDetails] = useState<DetailResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/staging");
      const json = await response.json();
      setRows(json.data ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function cancel(id: string) {
    const response = await fetch(`/api/staging/${id}`, { method: "DELETE" });
    if (response.ok) void load();
  }

  async function inspect(id: string) {
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/staging/${id}`);
      const json = await response.json();
      if (response.ok) setDetails(json);
    } finally {
      setLoadingDetails(false);
    }
  }

  async function merge() {
    setMerging(true);
    setMergeError(null);
    const response = await fetch("/api/staging/merge", { method: "POST" });
    const json = await response.json().catch(() => ({}));
    setMerging(false);
    setConfirmMerge(false);
    if (response.ok) window.location.reload();
    else setMergeError(json.error ?? "Perubahan tidak dapat diterapkan.");
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Perubahan yang Menunggu Diterapkan</h2>
        </div>
        {canWrite ? (
          <button type="button" disabled={!rows.length} onClick={() => setConfirmMerge(true)} className="inline-flex min-h-10 items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40">Terapkan {rows.length}</button>
        ) : null}
      </div>

      {mergeError ? <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{mergeError}</p> : null}

      <div className="mt-4 overflow-x-auto">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Memuat perubahan...</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Belum ada perubahan yang menunggu diterapkan. Gunakan tombol Catat Perubahan untuk memperbarui data.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Entitas</th>
                <th className="px-3 py-2">Identitas</th>
                <th className="px-3 py-2">Nama/Kategori</th>
                <th className="px-3 py-2">Lokasi</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Operator dan Waktu</th>
                <th className="px-3 py-2">Ringkasan</th>
                <th className="px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const badge = STATUS_BADGE[row.aksi];
                const isBuilding = row.entityType === "BANGUNAN";
                const isEvent = row.entityType === "PERISTIWA";
                return (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isBuilding ? "bg-indigo-50 text-indigo-700" : isEvent ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-700"}`}>{isBuilding ? <Building2 className="h-3.5 w-3.5" /> : isEvent ? <Activity className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}{isBuilding ? "Bangunan" : isEvent ? row.eventType?.replaceAll("_", " ") : "Penduduk"}</span></td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-700">{isBuilding ? `#${row.row.kodeBangunan ?? "-"}` : <><span className="block">No. KK {row.row.nkk ?? "-"}</span><span className="text-xs text-slate-400">NIK {row.row.nik ?? "-"}</span></>}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-800">{isBuilding ? row.row.kategoriBangunan ?? (row.row.jenisBangunan === "BERPENGHUNI" ? "Berpenghuni" : "Tidak berpenghuni") : row.row.nama ?? "-"}{!isBuilding && row.row.jk ? <span className="ml-2 text-xs font-normal text-slate-400">{row.row.jk === "L" ? "Laki-laki" : "Perempuan"} • {formatCell(row.row.tgl_lahir, mapping.kolom.tgl_lahir)}</span> : null}</td>
                    <td className="max-w-xs px-3 py-3 text-slate-600">{row.row.alamat || row.row.dusun || "-"}</td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>{badge.label}</span></td>
                    <td className="px-3 py-3 whitespace-nowrap"><p className="font-medium text-slate-700">{row.createdByName}</p>{row.createdByEmail ? <p className="text-xs text-slate-400">{row.createdByEmail}</p> : null}<p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Clock3 className="h-3 w-3" />{new Date(row.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" })}</p></td>
                    <td className="max-w-xs px-3 py-3 text-slate-500">{row.ringkasan ?? "-"}</td>
                    <td className="px-3 py-3"><div className="flex items-center gap-1"><button type="button" title="Lihat rincian perubahan" aria-label="Lihat rincian perubahan" disabled={loadingDetails} onClick={() => inspect(row.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-40"><Eye className="h-4 w-4" /></button>{canWrite ? <button type="button" title={row.groupId ? "Batalkan seluruh grup" : "Batalkan perubahan"} aria-label="Batalkan perubahan" onClick={() => cancel(row.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"><X className="h-4 w-4" /></button> : null}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {details ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="staging-detail-title" className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
              <div><h3 id="staging-detail-title" className="text-lg font-bold text-slate-900">Rincian perubahan</h3></div>
              <button type="button" title="Tutup" aria-label="Tutup rincian" onClick={() => setDetails(null)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-5 overflow-y-auto p-6">
              {details.data.map((detail, index) => {
                const photo = typeof detail.values.fotoUrl === "string" && detail.values.fotoUrl.startsWith("data:image/") ? detail.values.fotoUrl : null;
                const points = polygonPointCount(detail.values.polygon);
                const entries = Object.entries(detail.values).filter(([key, value]) => !INTERNAL_FIELDS.has(key) && value !== null && value !== undefined && value !== "");
                const personTitle = detail.values.status_dalam_keluarga === "Kepala Keluarga"
                  ? "Kepala Keluarga"
                  : detail.values.nama
                    ? `Anggota/Penduduk — ${String(detail.values.nama)}`
                    : `Penduduk ${index + 1}`;
                return (
                  <article key={detail.id} className="overflow-hidden rounded-2xl border border-slate-200">
                    <header className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-5 py-3"><div><p className="text-sm font-bold text-slate-900">{detail.entityType === "BANGUNAN" ? "Bangunan" : personTitle}</p><p className="text-xs text-slate-500">{detail.ringkasan}</p></div><span className="text-xs text-slate-500">{detail.createdByName} • {new Date(detail.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" })}</span></header>
                    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
                      <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
                        {detail.entityType === "BANGUNAN" && points ? <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Batas Bangunan di Peta</dt><dd className="mt-0.5 text-sm text-slate-700">{points} titik sudut; titik tengah dihitung otomatis</dd></div> : null}
                        {entries.map(([key, value]) => <div key={key}><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{detailLabel(detail.entityType, key)}</dt><dd className="mt-0.5 break-words text-sm text-slate-700">{detailValue(key, value)}</dd></div>)}
                      </dl>
                      {photo ? <Image src={photo} alt="Foto bangunan yang diajukan" width={180} height={240} unoptimized className="h-48 w-36 rounded-xl object-cover ring-1 ring-slate-200" /> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {confirmMerge ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Terapkan Perubahan Data</h3>
            <p className="mt-3 text-sm text-slate-600">Anda akan menerapkan <strong>{rows.length} perubahan</strong> sekaligus ke daftar data warga.</p>
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Riwayat periode baru akan menyimpan nama operator, waktu, serta jumlah data warga dan bangunan yang berubah.</p>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirmMerge(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Batal</button><button type="button" disabled={merging} onClick={merge} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{merging ? "Menerapkan..." : "Ya, Terapkan"}</button></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
