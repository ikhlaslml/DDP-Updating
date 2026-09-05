import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";
import { invalidatePeriodicUpdatingCache } from "@/lib/updating-cache";

const FIELDS = ["namaKepala", "kopBaris1", "kopBaris2", "kopBaris3", "kopBaris4", "penutup", "disclaimer"] as const;

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const s = await prisma.pengaturanDesa.findUnique({ where: { desaId: ctx.desaId } });
  return NextResponse.json({ data: s });
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });

  const data: Record<string, string | Date | null> = {};
  for (const f of FIELDS) {
    if (typeof body[f] === "string") data[f] = body[f];
  }
  if (body.tanggalBaselineData === "" || body.tanggalBaselineData === null) {
    data.tanggalBaselineData = null;
  } else if (typeof body.tanggalBaselineData === "string") {
    const baseline = new Date(body.tanggalBaselineData);
    if (Number.isNaN(baseline.getTime()) || baseline > new Date()) {
      return NextResponse.json(
        { error: "Tanggal baseline data tidak valid atau berada di masa depan" },
        { status: 400 },
      );
    }
    data.tanggalBaselineData = baseline;
  }

  const updated = await prisma.pengaturanDesa.upsert({
    where: { desaId: ctx.desaId },
    update: data,
    create: { desaId: ctx.desaId, ...data },
  });
  invalidatePeriodicUpdatingCache();
  return NextResponse.json({ data: updated });
}
