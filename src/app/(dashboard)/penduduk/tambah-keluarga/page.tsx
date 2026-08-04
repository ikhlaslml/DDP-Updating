import Link from "next/link";
import { PersonAdditionView } from "@/components/penduduk/PersonAdditionView";

export default function TambahKeluargaPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/penduduk" className="text-sm font-medium text-indigo-600 hover:underline">&larr; Kembali ke Data Kependudukan</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Tambah Kepala Keluarga</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">Tambahkan satu keluarga baru pada bangunan yang sudah disensus. Formulir kepala keluarga mencakup data individu dan kondisi seluruh rumah tangga sesuai DO DDP.</p>
      </div>
      <PersonAdditionView role="HEAD" />
    </div>
  );
}
