"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/peta/MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-400">Memuat peta...</p>,
});

export default function PetaPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Peta Sebaran</h1>
      <p className="text-slate-500 mb-6">Sebaran bangunan/keluarga berdasarkan koordinat hasil sensus.</p>
      <MapView />
    </div>
  );
}
