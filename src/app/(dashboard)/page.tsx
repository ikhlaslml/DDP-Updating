import { DashboardView } from "@/components/dashboard/DashboardView";

export default function DashboardHomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Dashboard</h1>
      <DashboardView />
    </div>
  );
}
