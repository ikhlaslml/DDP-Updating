import Link from "next/link";
import { BuildingDeletionView } from "@/components/penduduk/BuildingDeletionView";

export default function HapusBangunanPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/penduduk" className="text-sm font-medium text-indigo-600 hover:underline">&larr; Kembali ke Data Kependudukan</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Hapus Bangunan</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">Ajukan penghapusan bangunan fisik dari peta aktif tanpa menghapus penduduk dan riwayatnya.</p>
      </div>
      <BuildingDeletionView />
    </div>
  );
}
