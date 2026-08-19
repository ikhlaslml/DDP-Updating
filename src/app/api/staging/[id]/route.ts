import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";

function parseData(value: string | null) {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// Load an entire atomic group on demand so the operator can inspect every
// answer, polygon and photo before applying it to the baseline.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const { id } = await params;
  const selected = await prisma.stagingChange.findFirst({
    where: { id, desaId: ctx.desaId, status: "PENDING" },
  });
  if (!selected) return NextResponse.json({ error: "Perubahan tidak ditemukan" }, { status: 404 });

  const changes = selected.groupId
    ? await prisma.stagingChange.findMany({
        where: { desaId: ctx.desaId, groupId: selected.groupId, status: "PENDING" },
        orderBy: { createdAt: "asc" },
      })
    : [selected];
  const targetIds = changes.flatMap((change) => (change.pendudukId ? [change.pendudukId] : []));
  const targets = targetIds.length
    ? await prisma.penduduk.findMany({ where: { desaId: ctx.desaId, id: { in: targetIds } } })
    : [];
  const targetMap = new Map(targets.map((target) => [target.id, target as Record<string, unknown>]));

  return NextResponse.json({
    groupId: selected.groupId,
    data: changes
      .map((change) => {
        const proposed = parseData(change.entityType === "PERISTIWA" ? change.eventData : change.data);
        const baseline = change.pendudukId ? targetMap.get(change.pendudukId) ?? {} : {};
        return {
          id: change.id,
          entityType: change.entityType,
          eventType: change.eventType,
          aksi: change.aksi,
          ringkasan: change.ringkasan,
          createdAt: change.createdAt,
          createdByName: change.createdByName ?? "Operator Desa",
          createdByEmail: change.createdByEmail,
          values:
            change.aksi === "DELETE"
              ? baseline
              : change.aksi === "UPDATE"
                ? { ...baseline, ...proposed }
                : proposed,
        };
      })
      .sort((left, right) => (left.entityType === right.entityType ? 0 : left.entityType === "BANGUNAN" ? -1 : 1)),
  });
}

// Cancel (Batal) a single pending staged change.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;
  const { id } = await params;
  const existing = await prisma.stagingChange.findFirst({ where: { id, desaId: ctx.desaId } });
  if (!existing) return NextResponse.json({ error: "Perubahan tidak ditemukan" }, { status: 404 });
  const result = existing.groupId
    ? await prisma.stagingChange.deleteMany({
        where: { desaId: ctx.desaId, groupId: existing.groupId, status: "PENDING" },
      })
    : await prisma.stagingChange.deleteMany({
        where: { id, desaId: ctx.desaId, status: "PENDING" },
      });
  return NextResponse.json({ ok: true, removed: result.count });
}
