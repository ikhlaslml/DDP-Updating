import { ImportForm } from "@/components/impor-ekspor/ImportForm";

export default function ImporEksporPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Impor / Ekspor Data</h1>
        <p className="text-slate-500">Impor data dari CSV/Excel atau ekspor seluruh data penduduk.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-1">Impor Data</h2>
        <p className="text-xs text-slate-500 mb-4">
          Header kolom harus sesuai skema DDP (269 kolom). Kolom wajib: nama, nik, nkk, jk, dusun, rw, rt,
          tgl_lahir, status_dalam_keluarga. Unduh template untuk memastikan header sesuai.
        </p>
        <ImportForm />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-1">Ekspor Data</h2>
        <p className="text-xs text-slate-500 mb-4">
          Mengekspor seluruh data penduduk (269 kolom). Untuk mengekspor hasil filter tertentu, gunakan tombol
          Ekspor pada halaman Data Penduduk.
        </p>
        <div className="flex gap-3">
          {/* File downloads, not app navigation — <Link> isn't appropriate here. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/penduduk/export?format=csv"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Ekspor CSV
          </a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/penduduk/export?format=xlsx"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Ekspor Excel (.xlsx)
          </a>
        </div>
      </section>
    </div>
  );
}
