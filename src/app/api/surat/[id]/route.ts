import { NextResponse } from "next/server";
import { getIssuedLetterDocument } from "@/lib/letter-document";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const document = await getIssuedLetterDocument((await params).id, ctx.desaId);
  if (!document) return NextResponse.json({ error: "Surat tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ data: document });
}
