import { RiwayatView } from "@/components/riwayat/RiwayatView";

export default function RiwayatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Riwayat Data</h1>
      </div>
      <RiwayatView />
    </div>
  );
}
