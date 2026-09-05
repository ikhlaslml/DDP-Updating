import { Suspense } from "react";
import { PeriodicUpdatingView } from "@/components/penduduk/PeriodicUpdatingView";

export default function PeriodicUpdatingPage() {
  return (
    <Suspense fallback={<div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Memuat pembaruan berkala...</div>}>
      <PeriodicUpdatingView />
    </Suspense>
  );
}
