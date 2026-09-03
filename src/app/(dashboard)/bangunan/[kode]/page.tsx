import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, History, MapPin, UserRoundCheck, UsersRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthContext, isOperator } from "@/lib/tenant";
import { RespondentVisitForm } from "@/components/penduduk/RespondentVisitForm";
import { DdpBuildingPhoto } from "@/components/penduduk/DdpBuildingPhoto";
import { compareFamilyMembers, compareFamilyNkk } from "@/lib/family-order";

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

  const [building, legacy, pendingRows, residents, pendingPeople, sessions, progressRows, deletedBuilding] = await Promise.all([
    prisma.bangunan.findFirst({ where: { desaId: ctx.desaId, kode: code } }),
    prisma.penduduk.findFirst({ where: { desaId: ctx.desaId, kode_bangunan: code, statusAktif: true } }),
    prisma.stagingChange.findMany({ where: { desaId: ctx.desaId, entityType: "BANGUNAN", status: "PENDING" } }),
    prisma.penduduk.findMany({
      where: { desaId: ctx.desaId, kode_bangunan: code, statusAktif: true },
      select: { id: true, nkk: true, nik: true, nama: true, status_dalam_keluarga: true },
    }),
    prisma.stagingChange.findMany({
      where: { desaId: ctx.desaId, entityType: "PENDUDUK", aksi: "CREATE", status: "PENDING" },
      select: { id: true, data: true, createdAt: true },
    }),
    prisma.sesiPendataanBangunan.findMany({
      where: { desaId: ctx.desaId, kodeBangunan: code },
      orderBy: { diisiPada: "desc" },
    }),
    prisma.progresPendataanKeluarga.findMany({
      where: { desaId: ctx.desaId, kodeBangunan: code },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.bangunanDihapus.findUnique({ where: { desaId_kodeBangunan: { desaId: ctx.desaId, kodeBangunan: code } }, select: { id: true } }),
  ]);
  const stagedBuilding = pendingRows.map((row) => ({ row, data: parseJson(row.data) })).find(({ data }) => Number(data.kode) === code);
  if (deletedBuilding || (!building && !legacy && !stagedBuilding)) notFound();
  const buildingData = building ?? stagedBuilding?.data ?? legacy;
  const stagedResidents = pendingPeople
    .map((row) => ({ ...row, parsed: parseJson(row.data) }))
    .filter((row) => Number(row.parsed.kode_bangunan) === code);
  const latest = sessions[0];

  const progressByNkk = new Map(progressRows.map((row) => [row.nkk, row]));
  type Member = { id: string; nama: string | null; nik: string | null; status_dalam_keluarga: string | null; pending: boolean };
  type Family = { nkk: string; head: string; headId: string | null; count: number; pending: boolean; members: Member[] };
  const families = new Map<string, Family>();
  for (const resident of residents) {
    const nkk = resident.nkk ?? "Tanpa NKK";
    const current = families.get(nkk) ?? { nkk, head: "Belum diketahui", headId: null, count: 0, pending: false, members: [] };
    current.count += 1;
    current.members.push({ ...resident, pending: false });
    if (resident.status_dalam_keluarga === "Kepala Keluarga") {
      current.head = resident.nama ?? "Tanpa nama";
      current.headId = resident.id;
    }
    families.set(nkk, current);
  }
  for (const row of stagedResidents) {
    const nkk = String(row.parsed.nkk ?? "Tanpa NKK");
    const current = families.get(nkk) ?? { nkk, head: "Belum diketahui", headId: null, count: 0, pending: true, members: [] };
    current.count += 1;
    current.pending = true;
    current.members.push({
      id: row.id,
      nama: typeof row.parsed.nama === "string" ? row.parsed.nama : null,
      nik: typeof row.parsed.nik === "string" ? row.parsed.nik : null,
      status_dalam_keluarga: typeof row.parsed.status_dalam_keluarga === "string" ? row.parsed.status_dalam_keluarga : null,
      pending: true,
    });
    if (row.parsed.status_dalam_keluarga === "Kepala Keluarga") current.head = String(row.parsed.nama ?? "Tanpa nama");
    families.set(nkk, current);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/penduduk" className="text-sm font-medium text-indigo-600 hover:underline">&larr; Kembali ke Data Kependudukan</Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-900"><Building2 className="h-6 w-6 text-indigo-600" /> Bangunan #{code}</h1>
          <p className="mt-1 text-sm text-slate-500">{building ? "Data bangunan sudah diterapkan" : stagedBuilding ? "Menunggu diterapkan" : "Bangunan dari data awal sensus"}</p>
        </div>
        {isOperator(ctx.role) ? <RespondentVisitForm code={code} /> : null}
      </div>

      <section className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:grid-cols-3">
        <div><span className="text-xs font-semibold uppercase text-slate-400">Jenis</span><p className="mt-1 font-semibold text-slate-900">{String((buildingData as { jenis?: unknown }).jenis ?? "BERPENGHUNI").replaceAll("_", " ")}</p></div>
        <div><span className="text-xs font-semibold uppercase text-slate-400">Lokasi</span><p className="mt-1 flex items-start gap-2 font-semibold text-slate-900"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" /> {String((buildingData as { alamat?: unknown }).alamat ?? (buildingData as { dusun?: unknown }).dusun ?? "-")}</p></div>
        <div><span className="text-xs font-semibold uppercase text-slate-400">Keluarga</span><p className="mt-1 flex items-center gap-2 font-semibold text-slate-900"><UsersRound className="h-4 w-4 text-indigo-500" /> {families.size} keluarga terdata</p></div>
      </section>

      <DdpBuildingPhoto code={code} />

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2"><UserRoundCheck className="h-5 w-5 text-indigo-600" /><h2 className="text-lg font-bold text-slate-900">Identitas Responden Terakhir</h2></div>
        {latest ? (
          <div className="mt-4 grid items-center gap-4 text-center sm:grid-cols-[112px_1fr] sm:text-left">
            <Image src={latest.fotoRespondenUrl} alt={`Foto responden ${latest.namaResponden}`} width={112} height={140} unoptimized className="mx-auto h-36 w-28 rounded-xl object-cover ring-1 ring-slate-200 sm:mx-0" />
            <div className="min-w-0"><p className="break-words text-xl font-bold text-slate-900">{latest.namaResponden}</p><p className="mt-1 text-sm text-slate-500">Periode {latest.periode} · {readableDate(latest.diisiPada)}</p><p className="break-words text-sm text-slate-500">Enumerator: {latest.enumeratorName}</p></div>
          </div>
        ) : <p className="mt-4 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">Belum ada identitas responden pada riwayat bangunan ini.</p>}
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><UsersRound className="h-5 w-5 text-indigo-600" /> Daftar Keluarga</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[...families.values()].sort((left, right) => compareFamilyNkk(left.nkk, right.nkk)).map((family) => {
            const progress = progressByNkk.get(family.nkk);
            const incomplete = progress?.status === "BELUM_LENGKAP";
            return (
              <div key={family.nkk} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                  <div className="min-w-0"><p className="break-words font-bold text-slate-900">{family.head}</p><p className="break-all text-sm text-slate-500">No. KK {family.nkk}</p></div>
                  <div className="flex flex-col items-start gap-1 sm:items-end">
                    {family.pending ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Menunggu diterapkan</span> : null}
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${incomplete ? "bg-orange-100 text-orange-800" : "bg-emerald-100 text-emerald-800"}`}>{incomplete ? `Belum lengkap · Aspek ${progress.aspekTerakhir}/6` : "Data lengkap"}</span>
                  </div>
                </div>
                <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100 bg-slate-50 px-3">
                  {[...family.members].sort(compareFamilyMembers).map((member) => (
                    <li key={member.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0 break-words font-medium text-slate-700">{member.nama ?? "Tanpa nama"}{member.pending ? <span className="ml-2 text-xs font-normal text-amber-700">(menunggu)</span> : null}</span>
                      <span className="shrink-0 text-xs text-slate-500">{member.status_dalam_keluarga ?? "Hubungan belum diisi"}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{family.count} orang tercatat</p>{incomplete && family.headId ? <Link href={`/penduduk/${family.headId}/edit`} className="text-xs font-bold text-indigo-600 hover:underline">Lanjutkan Pendataan →</Link> : null}</div>
              </div>
            );
          })}
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
