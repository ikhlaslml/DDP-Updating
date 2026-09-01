import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchDdpBuildingPhoto } from "@/lib/ddp-building-photo";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

export const runtime = "nodejs";

function stagedHasCode(data: string | null, code: number) {
  try { return Number((JSON.parse(data ?? "{}") as { kode?: unknown }).kode) === code; } catch { return false; }
}

export async function GET(_: Request, { params }: { params: Promise<{ kode: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const code = Number((await params).kode);
  if (!Number.isSafeInteger(code) || code <= 0) return NextResponse.json({ error: "Kode bangunan tidak valid" }, { status: 400 });

  const [desa, building, legacy, staged, deletedBuilding] = await Promise.all([
    prisma.desa.findUnique({ where: { id: ctx.desaId }, select: { kodeWilayah: true } }),
    prisma.bangunan.findFirst({ where: { desaId: ctx.desaId, kode: code }, select: { id: true } }),
    prisma.penduduk.findFirst({ where: { desaId: ctx.desaId, kode_bangunan: code }, select: { id: true } }),
    prisma.stagingChange.findMany({
      where: { desaId: ctx.desaId, entityType: "BANGUNAN", status: "PENDING" },
      select: { data: true },
    }),
    prisma.bangunanDihapus.findUnique({ where: { desaId_kodeBangunan: { desaId: ctx.desaId, kodeBangunan: code } }, select: { id: true } }),
  ]);
  if (deletedBuilding) return NextResponse.json({ error: "Bangunan ini sudah dihapus dari peta aktif" }, { status: 410 });
  if (!building && !legacy && !staged.some((row) => stagedHasCode(row.data, code))) {
    return NextResponse.json({ error: "Bangunan tidak ditemukan pada tenant ini" }, { status: 404 });
  }
  if (!desa?.kodeWilayah) return NextResponse.json({ error: "Kode wilayah desa belum dikonfigurasi" }, { status: 404 });

  try {
    const metadata = await fetchDdpBuildingPhoto(code, desa.kodeWilayah);
    if (!metadata) return NextResponse.json({ error: "Foto bangunan DDP belum tersedia" }, { status: 404 });
    const image = await fetch(metadata.photoUrl, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!image.ok) throw new Error(`Storage foto merespons HTTP ${image.status}`);
    const contentType = image.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) throw new Error("Berkas Core DDP bukan gambar");
    const bytes = await image.arrayBuffer();
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "X-DDP-Photo-Id": metadata.id,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Foto DDP gagal dimuat" }, { status: 502 });
  }
}
