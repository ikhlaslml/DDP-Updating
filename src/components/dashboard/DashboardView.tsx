"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { Map as MapIcon, LayoutDashboard } from "lucide-react";
import { DashboardCharts } from "./DashboardCharts";

const MapView = dynamic(() => import("@/components/peta/MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-[560px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400">
      Memuat peta...
    </div>
  ),
});

type Mode = "peta" | "dashboard";

const TABS: { id: Mode; label: string; icon: typeof MapIcon }[] = [
  { id: "peta", label: "Peta", icon: MapIcon },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
];

function MapPanel() {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
      <h2 className="mb-4 text-lg font-bold text-slate-900">Peta Sebaran</h2>
      <MapView />
    </section>
  );
}

function DashboardPanel() {
  return (
    <DashboardCharts />
  );
}

export function DashboardView() {
  const [mode, setMode] = useState<Mode>("dashboard");

  return (
    <div className="space-y-6">
      <div className="inline-flex w-full flex-wrap gap-1 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:w-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setMode(t.id)}
            className={clsx(
              "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors sm:flex-none",
              mode === t.id
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {mode === "peta" ? <MapPanel /> : <DashboardPanel />}
    </div>
  );
}
