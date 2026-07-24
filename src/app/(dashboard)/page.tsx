import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { SuratKeluarCard } from "@/components/dashboard/SuratKeluarCard";

export default function DashboardHomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Dashboard</h1>
      <p className="text-slate-500 mb-6">Statistik dan grafik kependudukan desa.</p>
      <DashboardCharts />

      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Layanan Desa</h2>
        <p className="text-sm text-slate-500 mb-4">Ringkasan layanan administrasi untuk warga.</p>
        <SuratKeluarCard />
      </div>
    </div>
  );
}
