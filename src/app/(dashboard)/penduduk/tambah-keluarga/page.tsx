import Link from "next/link";
import { PersonAdditionView } from "@/components/penduduk/PersonAdditionView";

export default function TambahKeluargaPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/penduduk" className="text-sm font-medium text-indigo-600 hover:underline">&larr; Kembali ke Data Kependudukan</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Tambah Kepala Keluarga</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">Catat keluarga baru pada bangunan yang sudah ada. Isi seluruh 6 aspek kepala keluarga, lalu identitas tiap anggota satu per satu.</p>
      </div>
      <PersonAdditionView role="HEAD" />
    </div>
  );
}
