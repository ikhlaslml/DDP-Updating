import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HOUSEHOLD_INHERITED_FIELDS } from "@/lib/survey";
import { pendudukCreateSchema, flattenZodError } from "@/lib/validation";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";

const submissionSchema = z
  .object({
    role: z.enum(["HEAD", "MEMBER"]),
    buildingCode: z.coerce.number().int().positive().optional(),
    familyNkk: z.string().regex(/^\d{16}$/).optional(),
    eventType: z.enum(["KELAHIRAN", "MIGRASI_MASUK"]).optional(),
    eventData: z.record(z.string(), z.unknown()).optional(),
    data: z.record(z.string(), z.unknown()),
  })
  .superRefine((value, ctx) => {
    if (value.role === "HEAD" && !value.buildingCode) {
      ctx.addIssue({ code: "custom", path: ["buildingCode"], message: "Pilih bangunan yang akan dihuni" });
    }
    if (value.role === "MEMBER" && !value.familyNkk) {
      ctx.addIssue({ code: "custom", path: ["familyNkk"], message: "Pilih kepala keluarga" });
    }
    if (value.eventType === "KELAHIRAN" && value.role !== "MEMBER") {
      ctx.addIssue({ code: "custom", path: ["eventType"], message: "Kelahiran harus ditambahkan sebagai anggota keluarga" });
    }
    if (value.eventType && !value.eventData?.tanggal) {
      ctx.addIssue({ code: "custom", path: ["eventData", "tanggal"], message: "Tanggal peristiwa wajib diisi" });
    }
    if (value.eventType === "MIGRASI_MASUK" && !String(value.eventData?.asal ?? "").trim()) {
      ctx.addIssue({ code: "custom", path: ["eventData", "asal"], message: "Daerah asal wajib diisi" });
    }
  });

function derivedFields(data: Record<string, unknown>) {
  const birth = data.tgl_lahir instanceof Date ? data.tgl_lahir : data.tgl_lahir ? new Date(String(data.tgl_lahir)) : null;
  let age: number | undefined;
  if (birth && !Number.isNaN(birth.getTime())) {
    const today = new Date();
    age = today.getFullYear() - birth.getFullYear();
    if (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    ) {
      age -= 1;
    }
  }
  return {
    abs_id: data.abs_id || `ABS-${Date.now()}-${Math.floor(Math.random() * 100_000)}`,
    datamasuk: new Date(),
    ...(age === undefined ? {} : { usia: Math.max(0, age), usia_dec: Math.max(0, age) }),
  };
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;

  const body = submissionSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Pilihan sumber data belum lengkap", fields: flattenZodError(body.error) },
      { status: 400 }
    );
  }

  const { role, data } = body.data;
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const desa = await tx.desa.findUnique({ where: { id: ctx.desaId } });
        if (!desa) throw new Error("Desa pengguna tidak ditemukan");

        let authoritative: Record<string, unknown> = {};
        let nkk = "";
        let ringkasan = "";

        if (role === "HEAD") {
          const code = body.data.buildingCode as number;
          const [building, legacy] = await Promise.all([
            tx.bangunan.findFirst({ where: { desaId: ctx.desaId, kode: code } }),
            tx.penduduk.findFirst({ where: { desaId: ctx.desaId, kode_bangunan: code, statusAktif: true } }),
          ]);
          if (!building && !legacy) throw new Error("Bangunan tidak ditemukan pada desa ini");
          if (building?.jenis === "TIDAK_BERPENGHUNI") {
            throw new Error("Bangunan ini tercatat tidak berpenghuni. Ubah status bangunan terlebih dahulu.");
          }
          authoritative = {
            kode_bangunan: code,
            kode_deskel: desa.kodeWilayah ?? legacy?.kode_deskel ?? undefined,
            deskel: desa.nama,
            dusun: building?.dusun ?? legacy?.dusun,
            rw: building?.rw ?? legacy?.rw,
            rt: building?.rt ?? legacy?.rt,
            lat: building ? building.centroidLat.toFixed(7) : legacy?.lat,
            lng: building ? building.centroidLng.toFixed(7) : legacy?.lng,
            alamat: building?.alamat ?? legacy?.alamat,
            status_dalam_keluarga: "Kepala Keluarga",
            subjek: "Keluarga",
            responden: data.nama,
            kesediaan: "Ya",
            jml_keluarga: 1,
          };
          nkk = typeof data.nkk === "string" ? data.nkk : "";
          authoritative.nkk = nkk;
          authoritative.nama_kepala_rumah = data.nama;
          const existing = await tx.penduduk.count({ where: { desaId: ctx.desaId, nkk, statusAktif: true } });
          if (existing > 0) throw new Error("Nomor KK sudah disensus. Gunakan menu Tambah Anggota Keluarga.");
          const pending = await tx.stagingChange.findMany({
            where: { desaId: ctx.desaId, entityType: "PENDUDUK", aksi: "CREATE", status: "PENDING" },
            select: { data: true },
          });
          if (pending.some((change) => {
            try { return (JSON.parse(change.data ?? "{}") as { nkk?: string }).nkk === nkk; } catch { return false; }
          })) {
            throw new Error("Nomor KK sudah ada di perubahan sementara");
          }
          ringkasan = `Kepala keluarga baru pada bangunan #${code}`;
        } else {
          nkk = body.data.familyNkk as string;
          const head = await tx.penduduk.findFirst({
            where: { desaId: ctx.desaId, nkk, statusAktif: true, status_dalam_keluarga: "Kepala Keluarga" },
          });
          if (!head) throw new Error("Kepala keluarga tidak ditemukan");
          if (!data.status_dalam_keluarga || data.status_dalam_keluarga === "Kepala Keluarga") {
            throw new Error("Pilih status anggota dalam keluarga");
          }
          const inherited = Object.fromEntries(
            [...HOUSEHOLD_INHERITED_FIELDS, "responden", "kesediaan", "kode_bangunan", "kode_deskel", "deskel", "dusun", "rw", "rt", "lat", "lng", "alamat"]
              .flatMap((field) => head[field as keyof typeof head] !== undefined ? [[field, head[field as keyof typeof head]]] : [])
          );
          const baselineCount = await tx.penduduk.count({ where: { desaId: ctx.desaId, nkk, statusAktif: true } });
          authoritative = {
            ...inherited,
            nkk,
            subjek: "Individu",
            jml_keluarga: baselineCount + 1,
          };
          ringkasan = `Anggota baru keluarga ${head.nama ?? nkk}`;
        }

        const parsed = pendudukCreateSchema.safeParse({
          ...data,
          ...authoritative,
          ...derivedFields(data),
          enumerator: ctx.userName,
        });
        if (!parsed.success) {
          const error = new Error("Data penduduk belum lengkap") as Error & { fields?: Record<string, string> };
          error.fields = flattenZodError(parsed.error);
          throw error;
        }

        const nik = String(parsed.data.nik);
        const nama = typeof parsed.data.nama === "string" ? parsed.data.nama : null;
        const [baselineDupe, pendingDupe] = await Promise.all([
          tx.penduduk.findUnique({ where: { nik } }),
          tx.stagingChange.findFirst({
            where: { entityType: "PENDUDUK", status: "PENDING", nik },
          }),
        ]);
        if (pendingDupe) throw new Error("NIK sudah terdaftar di perubahan sementara");
        const reactivation = body.data.eventType === "MIGRASI_MASUK"
          && baselineDupe?.desaId === ctx.desaId
          && baselineDupe.statusAktif === false;
        if (baselineDupe && !reactivation) throw new Error("NIK sudah terdaftar sebagai penduduk aktif atau berada di desa lain");

        const created = await tx.stagingChange.create({
          data: {
            desaId: ctx.desaId,
            entityType: "PENDUDUK",
            groupId: randomUUID(),
            aksi: reactivation ? "UPDATE" : "CREATE",
            pendudukId: reactivation ? baselineDupe.id : null,
            nik,
            nama,
            ringkasan: body.data.eventType === "KELAHIRAN"
              ? `Kelahiran anggota keluarga ${nkk}`
              : body.data.eventType === "MIGRASI_MASUK"
                ? `Migrasi masuk: ${ringkasan}`
                : ringkasan,
            data: JSON.stringify(parsed.data),
            eventType: body.data.eventType,
            eventData: body.data.eventData ? JSON.stringify(body.data.eventData) : null,
            createdBy: ctx.userId,
            createdByName: ctx.userName,
            createdByEmail: ctx.userEmail,
          },
        });
        return created;
      },
      { isolationLevel: "Serializable", timeout: 30_000 }
    );
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const known = error as Error & { fields?: Record<string, string> };
    return NextResponse.json(
      { error: known.message || "Gagal menyimpan perubahan", fields: known.fields ?? {} },
      { status: 400 }
    );
  }
}
