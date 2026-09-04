"use client";

import dynamic from "next/dynamic";
import { DashboardCharts } from "./DashboardCharts";

const MapView = dynamic(() => import("@/components/peta/MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-[560px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400">
      Memuat peta...
    </div>
  ),
});

function MapPanel() {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
      <h2 className="mb-4 text-lg font-bold text-slate-900">Peta Sebaran Warga</h2>
      <MapView />
    </section>
  );
}

export function DashboardView() {
  return (
    <div className="space-y-6">
      <DashboardCharts />
      <MapPanel />
    </div>
  );
}
