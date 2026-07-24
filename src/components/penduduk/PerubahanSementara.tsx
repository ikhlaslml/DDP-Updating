"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCell } from "@/lib/format";
import { mapping } from "@/lib/indikator";
import { useCanWrite } from "@/components/providers/AuthInfo";

type StagingRow = {
  id: string;
  aksi: "CREATE" | "UPDATE" | "DELETE";
  ringkasan: string | null;
  row: {
    nkk: string | null;
    nik: string | null;
    nama: string | null;
    jk: string | null;
    dusun: string | null;
    tgl_lahir: string | null;
    alamat: string | null;
  };
};

const STATUS_BADGE: Record<StagingRow["aksi"], { label: string; cls: string }> = {
  CREATE: { label: "BARU", cls: "bg-emerald-100 text-emerald-700" },
  UPDATE: { label: "DIUBAH", cls: "bg-amber-100 text-amber-700" },
  DELETE: { label: "DIHAPUS", cls: "bg-red-100 text-red-700" },
};

export function PerubahanSementara() {
  const canWrite = useCanWrite();
  const [rows, setRows] = useState<StagingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [confirmMerge, setConfirmMerge] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staging");
      const json = await res.json();
      setRows(json.data ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel(id: string) {
    const res = await fetch(`/api/staging/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function merge() {
    setMerging(true);
    const res = await fetch("/api/staging/merge", { method: "POST" });
    setMerging(false);
    setConfirmMerge(false);
    if (res.ok) {
      // Reload so the baseline table + dashboard reflect the new snapshot.
      window.location.reload();
    }
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Data Perubahan Sementara</h2>
        {canWrite && (
          <button
            type="button"
            disabled={rows.length === 0}
            onClick={() => setConfirmMerge(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            Gabungkan {rows.length} Perubahan
          </button>
        )}
      </div>

      <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
        Perubahan di sini akan digabungkan dengan periode terakhir untuk membuat baseline
        data baru. Anda dapat membatalkan perubahan sebelum digabungkan.
      </p>

      <div className="mt-4 overflow-x-auto">
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">Memuat perubahan...</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Tidak ada data sementara. Tambah, ubah, atau hapus data di tabel baseline.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">No. KK</th>
                <th className="px-3 py-2">NIK</th>
                <th className="px-3 py-2">Nama</th>
                <th className="px-3 py-2">JK</th>
                <th className="px-3 py-2">Dusun</th>
                <th className="px-3 py-2">Tgl Lahir</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Ringkasan</th>
                <th className="px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const badge = STATUS_BADGE[r.aksi];
                return (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap text-slate-700">{r.row.nkk ?? "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-700">{r.row.nik ?? "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-800">{r.row.nama ?? "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-700">{r.row.jk ?? "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-700">{r.row.dusun ?? "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                      {formatCell(r.row.tgl_lahir, mapping.kolom["tgl_lahir"])}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-500">{r.ringkasan ?? "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {canWrite ? (
                        <button
                          type="button"
                          onClick={() => cancel(r.id)}
                          className="text-sm font-medium text-red-600 hover:underline"
                        >
                          Batal
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {confirmMerge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Konfirmasi Penggabungan Data</h3>
            <p className="mt-3 text-sm text-slate-600">
              Anda akan menggabungkan <strong>{rows.length} perubahan</strong> (tambah, ubah, hapus) ke dalam data baseline.
            </p>
            <p className="mt-2 text-sm font-semibold text-amber-700">
              Tindakan ini akan membuat snapshot data baru dan tidak dapat diurungkan.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmMerge(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={merging}
                onClick={merge}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {merging ? "Menggabungkan..." : "Ya, Gabungkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
