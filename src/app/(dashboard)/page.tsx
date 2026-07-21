import { DashboardCharts } from "@/components/dashboard/DashboardCharts";

export default function DashboardHomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Ringkasan</h1>
      <p className="text-slate-500 mb-6">Statistik dan grafik kependudukan desa.</p>
      <DashboardCharts />
    </div>
  );
}
