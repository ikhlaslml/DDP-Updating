import Link from "next/link";
import { BuildingDeletionView } from "@/components/penduduk/BuildingDeletionView";

export default function HapusBangunanPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/penduduk" className="text-sm font-medium text-indigo-600 hover:underline">&larr; Kembali ke Data Kependudukan</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Hapus Bangunan</h1>
      </div>
      <BuildingDeletionView />
    </div>
  );
}
