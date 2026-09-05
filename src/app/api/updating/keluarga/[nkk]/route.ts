import { NextRequest, NextResponse } from "next/server";
import { loadPeriodicFamilies } from "@/lib/periodic-updating";
import {
  cycleFromSlug,
  periodicColumns,
  LOCKED_IDENTITY_FIELDS,
} from "@/lib/updating-columns";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ nkk: string }> },
) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const { nkk } = await params;
  const cycle = cycleFromSlug(req.nextUrl.searchParams.get("siklus"));
  const family = (await loadPeriodicFamilies(ctx.desaId, cycle)).find(
    (item) => item.nkk === nkk,
  );
  if (!family) {
    return NextResponse.json({ error: "Keluarga tidak ditemukan" }, { status: 404 });
  }
  const columns = periodicColumns(cycle);
  return NextResponse.json({
    data: family,
    columns: {
      family: columns.family,
      head: columns.head,
      member: columns.member,
      lockedIdentity: LOCKED_IDENTITY_FIELDS,
    },
  });
}
