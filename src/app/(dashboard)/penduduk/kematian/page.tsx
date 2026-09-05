import Link from "next/link";
import { DemographicExitView } from "@/components/penduduk/DemographicExitView";
import { DemographicHistory } from "@/components/penduduk/DemographicHistory";

export default function KematianPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/penduduk" className="text-sm font-medium text-indigo-600 hover:underline">&larr; Kembali ke Data Kependudukan</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Catat Kematian</h1>
      </div>
      <DemographicExitView type="KEMATIAN" />
      <DemographicHistory mode="DEATH" />
    </div>
  );
}
