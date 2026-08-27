import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, History, MapPin, UserRoundCheck, UsersRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthContext, isOperator } from "@/lib/tenant";
import { RespondentVisitForm } from "@/components/penduduk/RespondentVisitForm";

function parseJson(value: string | null) {
  try { return JSON.parse(value ?? "{}") as Record<string, unknown>; } catch { return {}; }
}

function readableDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(date);
}

export default async function BuildingDetailPage({ params }: { params: Promise<{ kode: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) notFound();
  const code = Number((await params).kode);
  if (!Number.isSafeInteger(code) || code <= 0) notFound();

  const [building, legacy, pendingRows, residents, pendingPeople, sessions] = await Promise.all([
    prisma.bangunan.findFirst({ where: { desaId: ctx.desaId, kode: code } }),
    prisma.penduduk.findFirst({ where: { desaId: ctx.desaId, kode_bangunan: code, statusAktif: true } }),
    prisma.stagingChange.findMany({ where: { desaId: ctx.desaId, entityType: "BANGUNAN", status: "PENDING" } }),
    prisma.penduduk.findMany({
      where: { desaId: ctx.desaId, kode_bangunan: code, statusAktif: true },
      select: { id: true, nkk: true, nik: true, nama: true, status_dalam_keluarga: true },
      orderBy: [{ nkk: "asc" }, { nama: "asc" }],
    }),
    prisma.stagingChange.findMany({
      where: { desaId: ctx.desaId, entityType: "PENDUDUK", aksi: "CREATE", status: "PENDING" },
      select: { id: true, data: true, createdAt: true },
    }),
    prisma.sesiPendataanBangunan.findMany({
      where: { desaId: ctx.desaId, kodeBangunan: code },
      orderBy: { diisiPada: "desc" },
    }),
  ]);
  const stagedBuilding = pendingRows.map((row) => ({ row, data: parseJson(row.data) })).find(({ data }) => Number(data.kode) === code);
  if (!building && !legacy && !stagedBuilding) notFound();
  const buildingData = building ?? stagedBuilding?.data ?? legacy;
  const stagedResidents = pendingPeople
    .map((row) => ({ ...row, parsed: parseJson(row.data) }))
    .filter((row) => Number(row.parsed.kode_bangunan) === code);
  const latest = sessions[0];

  const families = new Map<string, { nkk: string; head: string; count: number; pending: boolean }>();
  for (const resident of residents) {
    const nkk = resident.nkk ?? "Tanpa NKK";
    const current = families.get(nkk) ?? { nkk, head: "Belum diketahui", count: 0, pending: false };
    current.count += 1;
    if (resident.status_dalam_keluarga === "Kepala Keluarga") current.head = resident.nama ?? "Tanpa nama";
    families.set(nkk, current);
  }
  for (const row of stagedResidents) {
    const nkk = String(row.parsed.nkk ?? "Tanpa NKK");
    const current = families.get(nkk) ?? { nkk, head: "Belum diketahui", count: 0, pending: true };
    current.count += 1;
    current.pending = true;
    if (row.parsed.status_dalam_keluarga === "Kepala Keluarga") current.head = String(row.parsed.nama ?? "Tanpa nama");
    families.set(nkk, current);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/penduduk" className="text-sm font-medium text-indigo-600 hover:underline">&larr; Kembali ke Data Kependudukan</Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-900"><Building2 className="h-6 w-6 text-indigo-600" /> Bangunan #{code}</h1>
          <p className="mt-1 text-sm text-slate-500">{building ? "Sudah masuk baseline" : stagedBuilding ? "Menunggu penggabungan" : "Bangunan baseline sensus"}</p>
        </div>
        {isOperator(ctx.role) ? <RespondentVisitForm code={code} /> : null}
      </div>

      <section className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:grid-cols-3">
        <div><span className="text-xs font-semibold uppercase text-slate-400">Jenis</span><p className="mt-1 font-semibold text-slate-900">{String((buildingData as { jenis?: unknown }).jenis ?? "BERPENGHUNI").replaceAll("_", " ")}</p></div>
        <div><span className="text-xs font-semibold uppercase text-slate-400">Lokasi</span><p className="mt-1 flex items-start gap-2 font-semibold text-slate-900"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" /> {String((buildingData as { alamat?: unknown }).alamat ?? (buildingData as { dusun?: unknown }).dusun ?? "-")}</p></div>
        <div><span className="text-xs font-semibold uppercase text-slate-400">Keluarga</span><p className="mt-1 flex items-center gap-2 font-semibold text-slate-900"><UsersRound className="h-4 w-4 text-indigo-500" /> {families.size} keluarga terdata</p></div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2"><UserRoundCheck className="h-5 w-5 text-indigo-600" /><h2 className="text-lg font-bold text-slate-900">Identitas Responden Terakhir</h2></div>
        {latest ? (
          <div className="mt-4 grid items-center gap-4 sm:grid-cols-[112px_1fr]">
            <Image src={latest.fotoRespondenUrl} alt={`Foto responden ${latest.namaResponden}`} width={112} height={140} unoptimized className="h-36 w-28 rounded-xl object-cover ring-1 ring-slate-200" />
            <div><p className="text-xl font-bold text-slate-900">{latest.namaResponden}</p><p className="mt-1 text-sm text-slate-500">Periode {latest.periode} · {readableDate(latest.diisiPada)}</p><p className="text-sm text-slate-500">Enumerator: {latest.enumeratorName}</p></div>
          </div>
        ) : <p className="mt-4 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">Belum ada identitas responden pada riwayat bangunan ini.</p>}
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><UsersRound className="h-5 w-5 text-indigo-600" /> Daftar Keluarga</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[...families.values()].map((family) => <div key={family.nkk} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-bold text-slate-900">{family.head}</p><p className="text-sm text-slate-500">No. KK {family.nkk}</p></div>{family.pending ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Menunggu penggabungan</span> : null}</div><p className="mt-2 text-xs text-slate-500">{family.count} orang tercatat</p></div>)}
          {!families.size ? <p className="text-sm text-slate-500">Belum ada keluarga pada bangunan ini.</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><History className="h-5 w-5 text-indigo-600" /> Riwayat Responden per Kunjungan</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm"><thead><tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500"><th className="px-3 py-2">Periode/Waktu</th><th className="px-3 py-2">Responden</th><th className="px-3 py-2">Enumerator</th><th className="px-3 py-2">Foto</th></tr></thead><tbody>{sessions.map((session) => <tr key={session.id} className="border-b border-slate-100"><td className="px-3 py-3"><strong>{session.periode}</strong><br /><span className="text-xs text-slate-500">{readableDate(session.diisiPada)}</span></td><td className="px-3 py-3 font-semibold">{session.namaResponden}</td><td className="px-3 py-3">{session.enumeratorName}</td><td className="px-3 py-3"><a href={session.fotoRespondenUrl} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline">Lihat foto</a></td></tr>)}</tbody></table>
        </div>
      </section>
    </div>
  );
}
