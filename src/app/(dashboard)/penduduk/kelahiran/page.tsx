import Link from "next/link";
import { PersonAdditionView } from "@/components/penduduk/PersonAdditionView";

export default function KelahiranPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/penduduk" className="text-sm font-medium text-indigo-600 hover:underline">&larr; Kembali ke Data Kependudukan</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Catat Kelahiran</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">Tambahkan bayi ke keluarga yang sudah terdata. Lokasi, No. KK, bangunan, dan kondisi rumah tangga diwarisi otomatis.</p>
      </div>
      <PersonAdditionView role="MEMBER" eventType="KELAHIRAN" />
    </div>
  );
}
