import { Landmark } from "lucide-react";

export default function LayananPbbPage() {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <h1 className="text-xl font-bold text-slate-900">Layanan Pajak Bumi dan Bangunan (PBB)</h1>
      <p className="mt-2 text-sm font-medium text-slate-500">Fitur ini sedang dalam pengembangan.</p>
      <p className="mt-3 text-sm text-slate-500">
        Modul ini akan terintegrasi dengan data kependudukan untuk memudahkan pengelolaan dan
        pemantauan pembayaran PBB warga desa.
      </p>
      <div className="mt-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Landmark className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}
