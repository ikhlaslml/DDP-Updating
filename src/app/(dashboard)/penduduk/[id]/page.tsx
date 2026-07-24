import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { KELOMPOK_ORDER, KELOMPOK_LABEL, kolomByKelompok } from "@/lib/indikator";
import { formatCell } from "@/lib/format";
import { DeleteButtonRedirect } from "@/components/penduduk/DeleteButtonRedirect";
import { getAuthContext } from "@/lib/tenant";

const GROUPED = kolomByKelompok();

export default async function DetailPendudukPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) notFound();
  const record = await prisma.penduduk.findFirst({ where: { id, desaId: ctx.desaId } });
  if (!record) notFound();

  const data = record as unknown as Record<string, unknown>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/penduduk" className="text-sm text-indigo-600 hover:underline">
            &larr; Kembali ke Pembaruan Data
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{String(data.nama ?? "-")}</h1>
          <p className="text-sm text-slate-500">
            NIK {String(data.nik ?? "-")} &middot; NKK {String(data.nkk ?? "-")} &middot; {String(data.dusun ?? "-")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/penduduk/${id}/edit`}
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
          >
            Ubah
          </Link>
          <DeleteButtonRedirect id={id} nama={String(data.nama ?? "")} />
        </div>
      </div>

      <div className="space-y-6">
        {KELOMPOK_ORDER.map((kelompok) => (
          <section key={kelompok} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">
              {KELOMPOK_LABEL[kelompok]}
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
              {GROUPED[kelompok].map(([name, def]) => (
                <div key={name}>
                  <dt className="text-xs text-slate-500">{def.label}</dt>
                  <dd className="text-sm text-slate-800 font-medium">{formatCell(data[name], def)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
