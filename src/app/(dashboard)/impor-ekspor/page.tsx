import { ImportForm } from "@/components/impor-ekspor/ImportForm";

export default function ImporEksporPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Impor / Ekspor Data</h1>
        <p className="text-slate-500">Impor data dari CSV/Excel atau ekspor seluruh data penduduk.</p>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-1">Impor Data</h2>
        <p className="text-xs text-slate-500 mb-4">
          Header kolom harus sesuai skema DDP (286 kolom). Kolom wajib: nama, nik, nkk, jk, dusun, rw, rt,
          tgl_lahir, status_dalam_keluarga, serta kode_deskel atau deskel. Impor pada halaman ini hanya menerima
          baris milik desa akun yang sedang login. CSV gabungan empat desa diproses melalui alat impor awal yang
          memisahkan tenant berdasarkan kode wilayah; data desa lain tidak akan dicampurkan.
        </p>
        <ImportForm />
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-1">Ekspor Data</h2>
        <p className="text-xs text-slate-500 mb-4">
          Mengekspor seluruh data penduduk (286 kolom). Untuk mengekspor hasil filter tertentu, gunakan tombol
          Ekspor pada halaman Pembaruan Data.
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
