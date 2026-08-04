import { Construction, MapPinned } from "lucide-react";

export default function PenambahanTitikSarprasPage() {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm sm:p-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
        <MapPinned className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-xl font-bold text-slate-900">Penambahan Titik Sarana dan Prasarana</h1>
      <p className="mt-2 text-sm font-semibold text-indigo-600">Fitur ini sedang dalam pengembangan.</p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
        Modul ini akan menyediakan peta digitasi untuk menambahkan lokasi sarana dan prasarana desa, melengkapi atribut, foto, serta koordinatnya secara presisi.
      </p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-500"><Construction className="h-4 w-4" /> Tahap perancangan</div>
    </div>
  );
}
