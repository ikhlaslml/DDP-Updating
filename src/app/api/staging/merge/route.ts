import { NextResponse } from "next/server";
import { mergeStaging } from "@/lib/updating";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";

// Merge all pending changes into the baseline and freeze a new snapshot (Tn).
export async function POST() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;

  const result = await mergeStaging(ctx.desaId);
  if (result.applied === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan untuk digabungkan" }, { status: 400 });
  }
  return NextResponse.json({
    applied: result.applied,
    snapshot: result.snapshot
      ? { kode: result.snapshot.kode, jumlah: result.snapshot.jumlah }
      : null,
  });
}
