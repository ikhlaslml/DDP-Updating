import Link from "next/link";
import { DemographicExitView } from "@/components/penduduk/DemographicExitView";
import { DemographicHistory } from "@/components/penduduk/DemographicHistory";

export default function MigrasiKeluarPage() {
  return <div className="space-y-6"><div><Link href="/penduduk" className="text-sm font-medium text-indigo-600 hover:underline">&larr; Kembali ke Data Kependudukan</Link><h1 className="mt-2 text-2xl font-bold text-slate-900">Mortalitas — Migrasi Keluar</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">Penduduk tetap tersimpan untuk audit, tetapi dinonaktifkan dari baseline dan statistik penduduk aktif setelah penggabungan.</p></div><DemographicExitView type="MIGRASI_KELUAR" /><DemographicHistory mode="EVENT" /></div>;
}
