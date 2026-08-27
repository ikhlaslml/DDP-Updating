"use client";

import { useRef, useState } from "react";
import { fieldLabel } from "@/lib/field-labels";

type ImportReport = {
  totalRows: number;
  successCount: number;
  failCount: number;
  unknownColumns: string[];
  rowErrors: { row: number; errors: Record<string, string> }[];
};

type ImportErrorResponse = {
  error: string;
  missingRequiredColumns?: string[];
  unknownColumns?: string[];
};

export function ImportForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<ImportErrorResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setLoading(true);
    setReport(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/penduduk/import", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setError(json);
      } else {
        setReport(json);
      }
    } catch {
      setError({ error: "Terjadi kesalahan jaringan." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          required
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Mengimpor..." : "Impor Data"}
        </button>
        {/* File download, not app navigation — <Link> isn't appropriate here. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/penduduk/export?template=1&format=csv"
          className="text-sm text-indigo-600 hover:underline"
        >
          Unduh template CSV
        </a>
      </form>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">{error.error}</p>
          {error.missingRequiredColumns && error.missingRequiredColumns.length > 0 && (
            <p className="mt-1">Kolom wajib yang hilang: {error.missingRequiredColumns.map((field) => fieldLabel(field)).join(", ")}</p>
          )}
          {error.unknownColumns && error.unknownColumns.length > 0 && (
            <p className="mt-1">Kolom tidak dikenali (diabaikan): {error.unknownColumns.join(", ")}</p>
          )}
        </div>
      )}

      {report && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-700">
            Total baris: <strong>{report.totalRows}</strong> — Masuk Perubahan Sementara:{" "}
            <strong className="text-emerald-600">{report.successCount}</strong> — Gagal:{" "}
            <strong className="text-red-600">{report.failCount}</strong>
          </p>
          {report.successCount > 0 ? <p className="mt-1 text-xs font-medium text-indigo-600">Periksa hasil impor di Data Kependudukan, lalu gunakan Gabungkan Perubahan setelah datanya benar.</p> : null}
          {report.unknownColumns.length > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              Kolom tidak dikenali (diabaikan): {report.unknownColumns.join(", ")}
            </p>
          )}
          {report.rowErrors.length > 0 && (
            <div className="mt-3 max-h-64 overflow-y-auto border border-slate-100 rounded-lg">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-1 text-left">Baris</th>
                    <th className="px-2 py-1 text-left">Kesalahan</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rowErrors.map((re) => (
                    <tr key={re.row} className="border-t border-slate-100">
                      <td className="px-2 py-1 align-top">{re.row}</td>
                      <td className="px-2 py-1">
                        {Object.entries(re.errors).map(([field, msg]) => (
                          <div key={field}>
                            <span className="font-medium">{fieldLabel(field)}</span>: {msg}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
