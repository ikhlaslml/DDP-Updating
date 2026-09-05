import { randomInt, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HOUSEHOLD_INHERITED_FIELDS } from "@/lib/survey";
import {
  REQUIRED_FIELDS,
  pendudukCreateSchema,
  pendudukUpdateSchema,
  flattenZodError,
} from "@/lib/validation";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";
import { registerIncompleteFamily } from "@/lib/family-progress";
import {
  generatedMigrationRegionKey,
  migrationRegionLabel,
  type MigrationRegion,
} from "@/lib/migration-region";

const submissionSchema = z
  .object({
    role: z.enum(["HEAD", "MEMBER"]),
    buildingCode: z.coerce.number().int().positive().optional(),
    familyNkk: z.string().regex(/^\d{16}$/).optional(),
    eventType: z.enum(["KELAHIRAN", "MIGRASI_MASUK"]).optional(),
    eventData: z.record(z.string(), z.unknown()).optional(),
    respondent: z.object({
      nama: z.string().trim().min(2).max(150),
      mediaAssetId: z.string().trim().min(1),
      fotoUrl: z.string().trim().startsWith("/api/media/"),
    }).optional(),
    data: z.record(z.string(), z.unknown()),
    members: z.array(z.record(z.string(), z.unknown())).max(30).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "HEAD" && !value.buildingCode) {
      ctx.addIssue({ code: "custom", path: ["buildingCode"], message: "Pilih bangunan yang akan dihuni" });
    }
    if (value.role === "HEAD" && !value.respondent) {
      ctx.addIssue({ code: "custom", path: ["respondent"], message: "Nama dan foto responden wajib diisi" });
    }
    if (value.role === "MEMBER" && !value.familyNkk) {
      ctx.addIssue({ code: "custom", path: ["familyNkk"], message: "Pilih kepala keluarga" });
    }
    if (value.role === "MEMBER" && value.members?.length) {
      ctx.addIssue({ code: "custom", path: ["members"], message: "Anggota tambahan hanya untuk keluarga baru" });
    }
    if (value.eventType === "KELAHIRAN" && value.role !== "MEMBER") {
      ctx.addIssue({ code: "custom", path: ["eventType"], message: "Kelahiran harus ditambahkan sebagai anggota keluarga" });
    }
    if (value.eventType && !value.eventData?.tanggal) {
      ctx.addIssue({ code: "custom", path: ["eventData", "tanggal"], message: "Tanggal peristiwa wajib diisi" });
    }
    if (value.eventType === "MIGRASI_MASUK") {
      for (const field of ["desaKelurahan", "kecamatan", "kabupatenKota", "provinsi"] as const) {
        if (!String(value.eventData?.[field] ?? "").trim()) {
          ctx.addIssue({ code: "custom", path: ["eventData", field], message: "Wilayah asal wajib diisi lengkap" });
        }
      }
    }
    if (value.eventType === "KELAHIRAN") {
      if (!String(value.eventData?.tempatLahir ?? "").trim()) {
        ctx.addIssue({ code: "custom", path: ["eventData", "tempatLahir"], message: "Tempat lahir wajib diisi" });
      }
      if (!/^\d{16}$/.test(String(value.eventData?.nikIbu ?? ""))) {
        ctx.addIssue({ code: "custom", path: ["eventData", "nikIbu"], message: "NIK ibu harus 16 digit" });
      }
      if (!String(value.eventData?.namaIbu ?? "").trim()) {
        ctx.addIssue({ code: "custom", path: ["eventData", "namaIbu"], message: "Nama ibu wajib diisi" });
      }
      if (!Number.isInteger(Number(value.eventData?.anakKe)) || Number(value.eventData?.anakKe) < 1) {
        ctx.addIssue({ code: "custom", path: ["eventData", "anakKe"], message: "Urutan anak wajib diisi" });
      }
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

function hasPendingBuildingDeletion(changes: { data: string | null }[], code: number) {
  return changes.some((change) => {
    try {
      return Number((JSON.parse(change.data ?? "{}") as { kode?: unknown }).kode) === code;
    } catch {
      return false;
    }
  });
}

async function generateProvisionalNik(
  tx: Prisma.TransactionClient,
  input: { kodeWilayah: string | null; tanggalLahir: unknown; jenisKelamin: unknown },
) {
  const birth = new Date(String(input.tanggalLahir ?? ""));
  if (Number.isNaN(birth.getTime())) throw new Error("Tanggal lahir diperlukan untuk membuat NIK sementara");
  const region = (input.kodeWilayah ?? "").replace(/\D/g, "").padEnd(6, "0").slice(0, 6);
  const female = ["P", "Perempuan"].includes(String(input.jenisKelamin ?? ""));
  const day = String(birth.getUTCDate() + (female ? 40 : 0)).padStart(2, "0");
  const month = String(birth.getUTCMonth() + 1).padStart(2, "0");
  const year = String(birth.getUTCFullYear()).slice(-2);
  const prefix = `${region}${day}${month}${year}`;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const nik = `${prefix}${String(randomInt(1, 10_000)).padStart(4, "0")}`;
    const [resident, pending] = await Promise.all([
      tx.penduduk.findUnique({ where: { nik }, select: { id: true } }),
      tx.stagingChange.findFirst({ where: { nik, status: "PENDING" }, select: { id: true } }),
    ]);
    if (!resident && !pending) return nik;
  }
  throw new Error("NIK sementara gagal dibuat. Coba simpan kembali.");
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
        const submittedData: Record<string, unknown> = { ...data };
        const normalizedEventData: Record<string, unknown> | null = body.data.eventData
          ? { ...body.data.eventData }
          : null;
        if (body.data.eventType === "KELAHIRAN") {
          submittedData.status_dalam_keluarga = "Anak";
          submittedData.status_kawin = "Belum Kawin";
          const generatedNik = !String(submittedData.nik ?? "").trim();
          if (generatedNik) {
            submittedData.nik = await generateProvisionalNik(tx, {
              kodeWilayah: desa.kodeWilayah,
              tanggalLahir: submittedData.tgl_lahir,
              jenisKelamin: submittedData.jk,
            });
          }
          if (normalizedEventData) {
            normalizedEventData.nikSementaraDibuat = generatedNik;
            normalizedEventData.nikBayi = submittedData.nik;
          }
        }
        if (body.data.eventType === "MIGRASI_MASUK" && normalizedEventData) {
          const region: MigrationRegion = {
            desaKelurahan: String(normalizedEventData.desaKelurahan ?? ""),
            kecamatan: String(normalizedEventData.kecamatan ?? ""),
            kabupatenKota: String(normalizedEventData.kabupatenKota ?? ""),
            provinsi: String(normalizedEventData.provinsi ?? ""),
          };
          normalizedEventData.asal = migrationRegionLabel(region);
          normalizedEventData.wilayahKodeDeskel = generatedMigrationRegionKey(region);
        }

        let authoritative: Record<string, unknown> = {};
        let nkk = "";
        let ringkasan = "";
        let selectedBuildingCode: number | null = null;
        let respondentMediaId: string | null = null;

        if (role === "HEAD") {
          const code = body.data.buildingCode as number;
          const [building, legacy, deletedBuilding, pendingBuildingDeletions] = await Promise.all([
            tx.bangunan.findFirst({ where: { desaId: ctx.desaId, kode: code } }),
            tx.penduduk.findFirst({ where: { desaId: ctx.desaId, kode_bangunan: code, statusAktif: true } }),
            tx.bangunanDihapus.findUnique({ where: { desaId_kodeBangunan: { desaId: ctx.desaId, kodeBangunan: code } }, select: { id: true } }),
            tx.stagingChange.findMany({
              where: { desaId: ctx.desaId, entityType: "BANGUNAN", aksi: "DELETE", status: "PENDING" },
              select: { data: true },
            }),
          ]);
          if (deletedBuilding) throw new Error("Bangunan ini sudah dihapus dari peta aktif dan tidak dapat ditempati kembali");
          if (hasPendingBuildingDeletion(pendingBuildingDeletions, code)) {
            throw new Error("Bangunan ini sedang diajukan untuk dihapus. Tunggu diterapkan atau batalkan penghapusan terlebih dahulu.");
          }
          if (!building && !legacy) throw new Error("Bangunan tidak ditemukan pada desa ini");
          if (building?.jenis === "TIDAK_BERPENGHUNI") {
            throw new Error("Bangunan ini tercatat tidak berpenghuni. Ubah status bangunan terlebih dahulu.");
          }
          const respondent = body.data.respondent;
          if (!respondent) throw new Error("Nama dan foto responden wajib diisi");
          const respondentMedia = await tx.mediaAsset.findFirst({
            where: { id: respondent.mediaAssetId, desaId: ctx.desaId, purpose: "RESPONDEN" },
          });
          if (!respondentMedia || respondent.fotoUrl !== `/api/media/${respondentMedia.id}`) {
            throw new Error("Foto responden tidak valid untuk desa ini");
          }
          selectedBuildingCode = code;
          respondentMediaId = respondentMedia.id;
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
            responden: respondent.nama,
            kesediaan: "Ya",
            jml_keluarga: (body.data.members?.length ?? 0) + 1,
          };
          nkk = typeof submittedData.nkk === "string" ? submittedData.nkk : "";
          authoritative.nkk = nkk;
          authoritative.nama_kepala_rumah = submittedData.nama;
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
          if (head.kode_bangunan !== null) {
            const [deletedBuilding, pendingBuildingDeletions] = await Promise.all([
              tx.bangunanDihapus.findUnique({
                where: { desaId_kodeBangunan: { desaId: ctx.desaId, kodeBangunan: head.kode_bangunan } },
                select: { id: true },
              }),
              tx.stagingChange.findMany({
                where: { desaId: ctx.desaId, entityType: "BANGUNAN", aksi: "DELETE", status: "PENDING" },
                select: { data: true },
              }),
            ]);
            if (deletedBuilding) throw new Error("Bangunan keluarga ini sudah dihapus dari peta aktif; pindahkan keluarga terlebih dahulu");
            if (hasPendingBuildingDeletion(pendingBuildingDeletions, head.kode_bangunan)) {
              throw new Error("Bangunan keluarga ini sedang diajukan untuk dihapus. Tunggu diterapkan atau batalkan penghapusan terlebih dahulu.");
            }
          }
          if (!submittedData.status_dalam_keluarga || submittedData.status_dalam_keluarga === "Kepala Keluarga") {
            throw new Error("Pilih status anggota dalam keluarga");
          }
          const inheritedFieldNames = [
            ...HOUSEHOLD_INHERITED_FIELDS,
            "responden",
            "kesediaan",
            "kode_bangunan",
            "kode_deskel",
            "deskel",
            "dusun",
            "rw",
            "rt",
            "lat",
            "lng",
            "alamat",
            ...(body.data.eventType === "KELAHIRAN" ? ["agama", "suku"] : []),
          ];
          const inherited = Object.fromEntries(
            [...new Set(inheritedFieldNames)]
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

        const parsed = (role === "HEAD" ? pendudukCreateSchema : pendudukUpdateSchema).safeParse({
          ...submittedData,
          ...(role === "HEAD" ? authoritative : {}),
          ...derivedFields(submittedData),
          enumerator: ctx.userName,
        });
        if (!parsed.success) {
          const error = new Error("Data penduduk belum lengkap") as Error & { fields?: Record<string, string> };
          error.fields = flattenZodError(parsed.error);
          throw error;
        }
        // Existing baselines can contain legacy enum labels no longer offered
        // by the current questionnaire. Preserve those household values exactly
        // instead of rejecting a new member because of historical head data.
        const normalizedData: Record<string, unknown> =
          role === "HEAD"
            ? (parsed.data as Record<string, unknown>)
            : { ...(parsed.data as Record<string, unknown>), ...authoritative };
        const missingRequired = [...REQUIRED_FIELDS].filter((field) => {
          const value = normalizedData[field];
          return value === undefined || value === null || value === "";
        });
        if (missingRequired.length) {
          const error = new Error("Data penduduk belum lengkap") as Error & {
            fields?: Record<string, string>;
          };
          error.fields = Object.fromEntries(
            missingRequired.map((field) => [field, "Wajib diisi"]),
          );
          throw error;
        }

        const nik = String(normalizedData.nik);
        const nama = typeof normalizedData.nama === "string" ? normalizedData.nama : null;
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

        const groupId = randomUUID();
        const created = await tx.stagingChange.create({
          data: {
            desaId: ctx.desaId,
            entityType: "PENDUDUK",
            groupId,
            aksi: reactivation ? "UPDATE" : "CREATE",
            pendudukId: reactivation ? baselineDupe.id : null,
            nik,
            nama,
            ringkasan: body.data.eventType === "KELAHIRAN"
              ? `Kelahiran anggota keluarga ${nkk}`
              : body.data.eventType === "MIGRASI_MASUK"
                ? `Migrasi masuk: ${ringkasan}`
                : ringkasan,
            data: JSON.stringify(normalizedData),
            eventType: body.data.eventType,
            eventData: normalizedEventData ? JSON.stringify(normalizedEventData) : null,
            createdBy: ctx.userId,
            createdByName: ctx.userName,
            createdByEmail: ctx.userEmail,
          },
        });
        if (role === "HEAD") {
          const extraMembers = body.data.members ?? [];
          const usedNiks = new Set([nik]);
          for (let index = 0; index < extraMembers.length; index += 1) {
            const member = extraMembers[index];
            const status = member.status_dalam_keluarga;
            if (!status || status === "Kepala Keluarga") {
              const error = new Error(`Status anggota ${index + 1} dalam keluarga belum valid`) as Error & { fields?: Record<string, string> };
              error.fields = { [`members.${index}.status_dalam_keluarga`]: "Pilih status anggota dalam keluarga" };
              throw error;
            }
            const inherited = Object.fromEntries(
              HOUSEHOLD_INHERITED_FIELDS.flatMap((field) =>
                normalizedData[field] !== undefined ? [[field, normalizedData[field]]] : []
              )
            );
            const memberParsed = pendudukCreateSchema.safeParse({
              ...member,
              ...inherited,
              ...authoritative,
              ...derivedFields(member),
              subjek: "Individu",
              status_dalam_keluarga: status,
              enumerator: ctx.userName,
            });
            if (!memberParsed.success) {
              const error = new Error(`Data anggota keluarga ${index + 1} belum lengkap`) as Error & { fields?: Record<string, string> };
              error.fields = Object.fromEntries(
                Object.entries(flattenZodError(memberParsed.error)).map(([key, message]) => [`members.${index}.${key}`, message])
              );
              throw error;
            }
            const memberData: Record<string, unknown> = {
              ...(memberParsed.data as Record<string, unknown>),
              ...inherited,
              ...authoritative,
              subjek: "Individu",
              status_dalam_keluarga: status,
            };
            const memberMissing = [...REQUIRED_FIELDS].filter((field) => {
              const value = memberData[field];
              return value === undefined || value === null || value === "";
            });
            if (memberMissing.length) {
              const error = new Error(`Data anggota keluarga ${index + 1} belum lengkap`) as Error & { fields?: Record<string, string> };
              error.fields = Object.fromEntries(memberMissing.map((field) => [`members.${index}.${field}`, "Wajib diisi"]));
              throw error;
            }
            const memberNik = String(memberData.nik);
            if (usedNiks.has(memberNik)) {
              const error = new Error("NIK penghuni tidak boleh duplikat") as Error & { fields?: Record<string, string> };
              error.fields = { [`members.${index}.nik`]: "Ada NIK yang sama dalam satu keluarga" };
              throw error;
            }
            usedNiks.add(memberNik);
            const [memberBaseline, memberPending] = await Promise.all([
              tx.penduduk.findUnique({ where: { nik: memberNik } }),
              tx.stagingChange.findFirst({ where: { entityType: "PENDUDUK", status: "PENDING", nik: memberNik } }),
            ]);
            if (memberPending) throw new Error(`NIK anggota ${index + 1} sudah terdaftar di perubahan sementara`);
            if (memberBaseline) throw new Error(`NIK anggota ${index + 1} sudah terdaftar sebagai penduduk`);
            await tx.stagingChange.create({
              data: {
                desaId: ctx.desaId,
                entityType: "PENDUDUK",
                groupId,
                aksi: "CREATE",
                nik: memberNik,
                nama: typeof memberData.nama === "string" ? memberData.nama : null,
                ringkasan: body.data.eventType === "MIGRASI_MASUK"
                  ? `Migrasi masuk anggota keluarga pada bangunan #${selectedBuildingCode}`
                  : `Anggota keluarga baru pada bangunan #${selectedBuildingCode}`,
                data: JSON.stringify(memberData),
                eventType: body.data.eventType,
                eventData: normalizedEventData ? JSON.stringify(normalizedEventData) : null,
                createdBy: ctx.userId,
                createdByName: ctx.userName,
                createdByEmail: ctx.userEmail,
              },
            });
          }
        }
        if (role === "HEAD" && selectedBuildingCode !== null) {
          await registerIncompleteFamily(tx, {
            desaId: ctx.desaId,
            nkk,
            kodeBangunan: selectedBuildingCode,
            stagingGroupId: groupId,
            userId: ctx.userId,
            userName: ctx.userName,
            complete: true,
          });
        }
        if (role === "HEAD" && selectedBuildingCode !== null && respondentMediaId) {
          const respondent = body.data.respondent as NonNullable<typeof body.data.respondent>;
          const [latestSession, latestSnapshot] = await Promise.all([
            tx.sesiPendataanBangunan.findFirst({
              where: { desaId: ctx.desaId, kodeBangunan: selectedBuildingCode },
              orderBy: { diisiPada: "desc" },
              select: { id: true },
            }),
            tx.snapshot.findFirst({
              where: { desaId: ctx.desaId },
              orderBy: { urutan: "desc" },
              select: { kode: true },
            }),
          ]);
          await tx.sesiPendataanBangunan.create({
            data: {
              desaId: ctx.desaId,
              bangunanId: null,
              kodeBangunan: selectedBuildingCode,
              stagingGroupId: groupId,
              periode: latestSnapshot?.kode ?? "T0",
              namaResponden: respondent.nama,
              fotoRespondenUrl: respondent.fotoUrl,
              mediaAssetId: respondentMediaId,
              enumeratorId: ctx.userId,
              enumeratorName: ctx.userName,
              enumeratorEmail: ctx.userEmail || null,
              supersedesId: latestSession?.id ?? null,
            },
          });
        }
        return { change: created, buildingCode: selectedBuildingCode };
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
