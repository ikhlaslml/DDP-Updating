import { LayananSuratView } from "@/components/surat/LayananSuratView";

export default function LayananSuratPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Layanan Surat</h1>
        <p className="mt-1 text-sm text-slate-500">Buat surat keterangan berbasis data kependudukan.</p>
      </div>
      <LayananSuratView />
    </div>
  );
}
