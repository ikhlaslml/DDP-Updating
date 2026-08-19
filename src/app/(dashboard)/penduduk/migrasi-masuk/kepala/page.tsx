import Link from "next/link";
import { PersonAdditionView } from "@/components/penduduk/PersonAdditionView";

export default function MigrasiMasukKepalaPage() {
  return <div className="space-y-6"><div><Link href="/penduduk/migrasi-masuk" className="text-sm font-medium text-indigo-600 hover:underline">&larr; Pilih jalur lain</Link><h1 className="mt-2 text-2xl font-bold text-slate-900">Migrasi Masuk Kepala Keluarga</h1></div><PersonAdditionView role="HEAD" eventType="MIGRASI_MASUK" /></div>;
}
