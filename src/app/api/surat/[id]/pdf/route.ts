import { NextRequest, NextResponse } from "next/server";
import { getIssuedLetterDocument } from "@/lib/letter-document";
import { renderLetterPdf } from "@/lib/letter-pdf";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const document = await getIssuedLetterDocument((await params).id, ctx.desaId, { includeLogo: true });
  if (!document) return NextResponse.json({ error: "Surat tidak ditemukan" }, { status: 404 });
  const pdf = await renderLetterPdf(document);
  const inline = req.nextUrl.searchParams.get("mode") === "inline";
  const filename = `surat-${document.letter.nomor.replace(/[^a-zA-Z0-9.-]+/g, "-")}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.byteLength),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
