import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { FORBIDDEN, getAuthContext, isOperator, UNAUTHORIZED } from "@/lib/tenant";

const inputSchema = z.object({ assetId: z.string().min(1).nullable() });

export async function PUT(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Referensi tanda tangan tidak valid" }, { status: 400 });
  }

  const asset = parsed.data.assetId
    ? await prisma.mediaAsset.findFirst({
        where: { id: parsed.data.assetId, desaId: ctx.desaId, purpose: "TANDA_TANGAN" },
        select: { id: true },
      })
    : null;
  if (parsed.data.assetId && !asset) {
    return NextResponse.json({ error: "Tanda tangan tidak ditemukan pada desa ini" }, { status: 404 });
  }

  const tandaTanganUrl = asset ? `/api/media/${asset.id}` : null;
  const data = await prisma.pengaturanDesa.upsert({
    where: { desaId: ctx.desaId },
    update: {
      tandaTanganMediaAssetId: asset?.id ?? null,
      tandaTanganUrl,
      tandaTanganUpdatedAt: asset ? new Date() : null,
    },
    create: {
      desaId: ctx.desaId,
      tandaTanganMediaAssetId: asset?.id ?? null,
      tandaTanganUrl,
      tandaTanganUpdatedAt: asset ? new Date() : null,
    },
  });
  return NextResponse.json({ data });
}
