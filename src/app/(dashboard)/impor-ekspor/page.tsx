import { ImportForm } from "@/components/impor-ekspor/ImportForm";
import { PeriodExportControls } from "@/components/impor-ekspor/PeriodExportControls";

export default function ImporEksporPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-bold text-slate-900">Impor / Ekspor Data</h1>
        <p className="text-slate-500">Impor data dari CSV/Excel atau ekspor data penduduk dari periode yang dipilih.</p>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Impor Data</h2>
        <p className="mb-4 text-xs text-slate-500">
          Header kolom harus sesuai skema DDP (286 kolom). Kolom wajib: nama, nik, nkk, jk, dusun, rw, rt,
          tgl_lahir, status_dalam_keluarga, serta kode_deskel atau deskel. Impor pada halaman ini hanya menerima
          baris milik desa akun yang sedang login. CSV gabungan empat desa diproses melalui alat impor awal yang
          memisahkan tenant berdasarkan kode wilayah; data desa lain tidak akan dicampurkan.
        </p>
        <ImportForm />
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Ekspor Data</h2>
        <p className="mb-4 text-xs text-slate-500">
          Ekspor mempertahankan 286 kolom yang sama. Pilih periode yang ingin dijadikan sumber file; untuk hasil filter tertentu,
          gunakan tombol Ekspor pada halaman Data Kependudukan.
        </p>
        <PeriodExportControls />
      </section>
    </div>
  );
}
