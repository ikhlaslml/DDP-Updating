import { RiwayatView } from "@/components/riwayat/RiwayatView";

export default function RiwayatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Riwayat Data</h1>
        <p className="mt-1 text-sm text-slate-500">
          Lihat snapshot data kependudukan pada setiap periode (T0, T1, …).
        </p>
      </div>
      <RiwayatView />
    </div>
  );
}
