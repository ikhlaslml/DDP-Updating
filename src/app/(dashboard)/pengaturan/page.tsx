import { PengaturanTabs } from "@/components/pengaturan/PengaturanTabs";

export default async function PengaturanPage({ searchParams }: { searchParams: Promise<{ menu?: string }> }) {
  const { menu } = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
        <p className="mt-1 text-sm text-slate-500">Kelola identitas desa, kop surat, template, dan harga komoditas.</p>
      </div>
      <PengaturanTabs initialMenu={menu === "harga-komoditas" ? "harga-komoditas" : "identitas"} />
    </div>
  );
}
