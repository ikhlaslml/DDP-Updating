import { PengaturanTabs } from "@/components/pengaturan/PengaturanTabs";

export default async function PengaturanPage({ searchParams }: { searchParams: Promise<{ menu?: string }> }) {
  const { menu } = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Administrasi Desa</h1>
        <p className="mt-1 text-sm text-slate-500">Kelola identitas resmi desa, kop dan template surat, serta harga komoditas.</p>
      </div>
      <PengaturanTabs initialMenu={menu === "harga-komoditas" ? "harga-komoditas" : "identitas"} />
    </div>
  );
}
