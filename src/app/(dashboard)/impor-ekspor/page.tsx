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
          Gunakan berkas CSV atau Excel sesuai format data DDP. Kolom pentingnya meliputi nama, NIK, nomor KK,
          jenis kelamin, dusun, RW, RT, tanggal lahir, hubungan dalam keluarga, serta kode atau nama desa.
          Halaman ini hanya memproses data untuk desa yang sedang Anda kelola. Berkas gabungan empat desa diproses
          melalui impor awal oleh administrator agar data tiap desa tetap terpisah.
        </p>
        <ImportForm />
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Ekspor Data</h2>
        <p className="mb-4 text-xs text-slate-500">
          Pilih periode data yang ingin diunduh. Untuk file sesuai pencarian atau filter tertentu, gunakan tombol Excel atau CSV
          pada halaman Data Kependudukan.
        </p>
        <PeriodExportControls />
      </section>
    </div>
  );
}
