import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PendudukForm } from "@/components/penduduk/PendudukForm";
import { getAuthContext } from "@/lib/tenant";

export default async function EditPendudukPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) notFound();
  const record = await prisma.penduduk.findFirst({ where: { id, desaId: ctx.desaId } });
  if (!record) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Ubah Data: {record.nama}</h1>
      <p className="text-sm text-slate-500 mb-6">
        Lengkapi data per kelompok indikator. Kolom bertanda * wajib diisi.
      </p>
      <PendudukForm mode="edit" id={id} initial={record as unknown as Record<string, unknown>} />
    </div>
  );
}
