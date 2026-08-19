import Link from "next/link";
import { PersonAdditionView } from "@/components/penduduk/PersonAdditionView";

export default function MigrasiMasukAnggotaPage() {
  return <div className="space-y-6"><div><Link href="/penduduk/migrasi-masuk" className="text-sm font-medium text-indigo-600 hover:underline">&larr; Pilih jalur lain</Link><h1 className="mt-2 text-2xl font-bold text-slate-900">Migrasi Masuk Anggota Keluarga</h1></div><PersonAdditionView role="MEMBER" eventType="MIGRASI_MASUK" /></div>;
}
