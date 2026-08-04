import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pendudukCreateSchema, flattenZodError } from "@/lib/validation";
import { ALL_COLUMNS } from "@/lib/indikator";
import { buildPendudukWhere } from "@/lib/query";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";

const COLUMN_SET = new Set(ALL_COLUMNS);
const SORTABLE = new Set([...ALL_COLUMNS, "createdAt", "updatedAt"]);

function parseSelect(columnsParam: string | null): Record<string, true> | undefined {
  if (!columnsParam) return undefined;
  const requested = columnsParam.split(",").map((c) => c.trim()).filter(Boolean);
  const valid = requested.filter((c) => COLUMN_SET.has(c));
  if (valid.length === 0) return undefined;
  const select: Record<string, true> = { id: true };
  for (const c of valid) select[c] = true;
  return select;
}

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const sp = req.nextUrl.searchParams;

  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(sp.get("pageSize")) || 25));
  const sortByParam = sp.get("sortBy") || "createdAt";
  const sortDir = sp.get("sortDir") === "asc" ? "asc" : "desc";
  const sortBy = SORTABLE.has(sortByParam) ? sortByParam : "createdAt";

  const where = buildPendudukWhere(sp, ctx.desaId);
  const select = parseSelect(sp.get("columns"));

  const [total, data] = await Promise.all([
    prisma.penduduk.count({ where }),
    prisma.penduduk.findMany({
      where,
      select,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    data,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });

  const parsed = pendudukCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validasi gagal", fields: flattenZodError(parsed.error) }, { status: 400 });
  }

  const data = { ...parsed.data } as Record<string, unknown>;
  if (!data.abs_id) {
    data.abs_id = `ABS${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  const existingNik = await prisma.penduduk.findUnique({ where: { nik: data.nik as string } });
  if (existingNik) {
    return NextResponse.json({ error: "Validasi gagal", fields: { nik: "NIK sudah terdaftar" } }, { status: 400 });
  }
  const pendingNik = await prisma.stagingChange.findFirst({
    where: { entityType: "PENDUDUK", status: "PENDING", nik: String(data.nik) },
  });
  if (pendingNik) {
    return NextResponse.json({ error: "Validasi gagal", fields: { nik: "NIK sudah ada di perubahan sementara" } }, { status: 400 });
  }

  const created = await prisma.stagingChange.create({
    data: {
      desaId: ctx.desaId,
      entityType: "PENDUDUK",
      aksi: "CREATE",
      nik: String(data.nik),
      nama: typeof data.nama === "string" ? data.nama : null,
      ringkasan: "Penambahan data melalui API.",
      data: JSON.stringify(data),
      createdBy: ctx.userId,
      createdByName: ctx.userName,
      createdByEmail: ctx.userEmail,
    },
  });
  return NextResponse.json({ data: created }, { status: 201 });
}
