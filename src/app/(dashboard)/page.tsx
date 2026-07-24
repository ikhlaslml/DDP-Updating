import { DashboardView } from "@/components/dashboard/DashboardView";

export default function DashboardHomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Dashboard</h1>
      <p className="text-slate-500 mb-6">Statistik, grafik, dan peta sebaran kependudukan desa.</p>
      <DashboardView />
    </div>
  );
}
