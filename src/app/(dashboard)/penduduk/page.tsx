import { PendudukTable } from "@/components/penduduk/PendudukTable";
import { PerubahanSementara } from "@/components/penduduk/PerubahanSementara";
import { UpdatingReminder } from "@/components/penduduk/UpdatingReminder";
import { DemographicHistory } from "@/components/penduduk/DemographicHistory";
import { parseKelompokParam } from "@/lib/indikator";

export default async function DataKependudukanPage({ searchParams }: { searchParams: Promise<{ aspek?: string; q?: string }> }) {
  const { aspek, q } = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Data Kependudukan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Lihat dan perbarui data warga. Setiap perubahan diperiksa terlebih dahulu sebelum diterapkan.
        </p>
      </div>

      <PerubahanSementara />

      <UpdatingReminder />

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Daftar Warga</h2>
        <PendudukTable
          key={`${aspek ?? ""}|${q ?? ""}`}
          initialAspects={parseKelompokParam(aspek)}
          initialQuery={q ?? ""}
        />
      </section>

      <DemographicHistory mode="EVENT" />
    </div>
  );
}
