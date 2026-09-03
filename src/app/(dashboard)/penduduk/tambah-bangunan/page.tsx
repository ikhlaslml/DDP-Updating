import Link from "next/link";
import { BuildingAdditionWizard } from "@/components/penduduk/BuildingAdditionWizard";

export default function TambahBangunanPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/penduduk" className="text-sm font-medium text-indigo-600 hover:underline">&larr; Kembali ke Data Kependudukan</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Tambah Bangunan Baru</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">Tandai bentuk bangunan pada peta, lalu isi jenis bangunan dan data keluarga yang menempatinya.</p>
      </div>
      <BuildingAdditionWizard />
    </div>
  );
}
