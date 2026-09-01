import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { storePrivateMedia } from "@/lib/media-storage";
import { FORBIDDEN, getAuthContext, isOperator, UNAUTHORIZED } from "@/lib/tenant";

export const runtime = "nodejs";

const purposeSchema = z.enum(["RESPONDEN", "LOGO_DESA", "TANDA_TANGAN"]);
const RULES = {
  RESPONDEN: { types: new Set(["image/jpeg", "image/png", "image/webp"]), max: 1_500_000 },
  LOGO_DESA: { types: new Set(["image/jpeg", "image/png", "image/svg+xml"]), max: 2_000_000 },
  TANDA_TANGAN: { types: new Set(["image/jpeg", "image/png"]), max: 1_000_000 },
} as const;

const EXTENSIONS_BY_MIME: Record<string, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/svg+xml": ["svg"],
};

function hasValidFileName(file: File) {
  const name = file.name.trim();
  if (!name || name.length > 255 || /[\\/\0\r\n]/.test(name)) return false;
  const extension = name.split(".").pop()?.toLocaleLowerCase("en-US");
  return Boolean(extension && EXTENSIONS_BY_MIME[file.type]?.includes(extension));
}

function svgIsSafe(text: string) {
  return (
    /^\s*<svg[\s>]/i.test(text) &&
    !/<(?:script|foreignObject|iframe|object|embed|link|style)\b/i.test(text) &&
    !/\bon\w+\s*=/i.test(text) &&
    !/(?:href|src)\s*=\s*["']\s*(?:https?:|data:text\/html|javascript:)/i.test(text) &&
    !/<!DOCTYPE|<!ENTITY/i.test(text)
  );
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;

  const form = await req.formData().catch(() => null);
  const purpose = purposeSchema.safeParse(form?.get("purpose"));
  const file = form?.get("file");
  if (!purpose.success || !(file instanceof File)) {
    return NextResponse.json({ error: "Tujuan dan berkas media wajib diisi" }, { status: 400 });
  }
  const rules = RULES[purpose.data];
  if (!rules.types.has(file.type as never)) {
    return NextResponse.json({ error: "Tipe berkas tidak didukung untuk unggahan ini" }, { status: 415 });
  }
  if (!hasValidFileName(file)) {
    return NextResponse.json({ error: "Nama atau ekstensi berkas tidak sesuai dengan tipe gambar" }, { status: 400 });
  }
  if (!file.size || file.size > rules.max) {
    return NextResponse.json({ error: `Ukuran berkas maksimal ${Math.round(rules.max / 1_000_000)} MB` }, { status: 413 });
  }
  if (file.type === "image/svg+xml" && !svgIsSafe(await file.text())) {
    return NextResponse.json({ error: "SVG mengandung elemen atau referensi yang tidak aman" }, { status: 400 });
  }

  try {
    const stored = await storePrivateMedia(file, ctx.desaId, purpose.data);
    const asset = await prisma.mediaAsset.create({
      data: {
        desaId: ctx.desaId,
        ...stored,
        mimeType: file.type,
        sizeBytes: file.size,
        purpose: purpose.data,
        originalName: file.name.slice(0, 255),
        uploadedBy: ctx.userId,
        uploadedByName: ctx.userName,
      },
    });
    return NextResponse.json({
      data: {
        id: asset.id,
        url: `/api/media/${asset.id}`,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
      },
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Media gagal disimpan" },
      { status: 500 }
    );
  }
}
