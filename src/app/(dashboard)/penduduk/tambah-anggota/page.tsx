import Link from "next/link";
import { PersonAdditionView } from "@/components/penduduk/PersonAdditionView";

export default function TambahAnggotaPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/penduduk" className="text-sm font-medium text-indigo-600 hover:underline">&larr; Kembali ke Data Kependudukan</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Tambah Anggota Keluarga</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">Pilih kepala keluarga yang sudah disensus. Sistem mewarisi bangunan, alamat, koordinat, No. KK, dan data rumah tangga secara otomatis.</p>
      </div>
      <PersonAdditionView role="MEMBER" />
    </div>
  );
}
