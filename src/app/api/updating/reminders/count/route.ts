import { NextResponse } from "next/server";
import { periodicReminderCounts } from "@/lib/updating-cache";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  return NextResponse.json(await periodicReminderCounts(ctx.desaId));
}
