import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readPrivateMedia } from "@/lib/media-storage";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const { id } = await params;
  const asset = await prisma.mediaAsset.findFirst({ where: { id, desaId: ctx.desaId } });
  if (!asset) return NextResponse.json({ error: "Media tidak ditemukan" }, { status: 404 });

  try {
    const bytes = await readPrivateMedia(asset);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `inline; filename="${(asset.originalName ?? "media").replace(/["\r\n]/g, "")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        ...(asset.mimeType === "image/svg+xml"
          ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" }
          : {}),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Media tidak dapat dibaca" },
      { status: 502 }
    );
  }
}
