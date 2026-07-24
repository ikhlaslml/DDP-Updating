import { PengaturanView } from "@/components/pengaturan/PengaturanView";

export default function PengaturanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
        <p className="mt-1 text-sm text-slate-500">Pengaturan umum, kop surat, dan template dokumen.</p>
      </div>
      <PengaturanView />
    </div>
  );
}
