import Link from "next/link";
import { BuildingAdditionWizard } from "@/components/penduduk/BuildingAdditionWizard";

export default function MigrasiMasukBangunanPage() {
  return <div className="space-y-6"><div><Link href="/penduduk/migrasi-masuk" className="text-sm font-medium text-indigo-600 hover:underline">&larr; Pilih jalur lain</Link><h1 className="mt-2 text-2xl font-bold text-slate-900">Migrasi Masuk ke Bangunan Baru</h1></div><BuildingAdditionWizard eventType="MIGRASI_MASUK" /></div>;
}
