import { PendudukForm } from "@/components/penduduk/PendudukForm";

export default function TambahPendudukPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Tambah Pembaruan Data</h1>
      <p className="text-sm text-slate-500 mb-6">
        Lengkapi data per kelompok indikator. Kolom bertanda * wajib diisi.
      </p>
      <PendudukForm mode="create" />
    </div>
  );
}
