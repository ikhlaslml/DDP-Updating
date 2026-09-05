import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildingSubmissionSchema, validateAndSerializePolygon } from "@/lib/building";
import { HOUSEHOLD_INHERITED_FIELDS } from "@/lib/survey";
import { pendudukCreateSchema, flattenZodError } from "@/lib/validation";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";
import { registerIncompleteFamily } from "@/lib/family-progress";
import {
  generatedMigrationRegionKey,
  migrationRegionLabel,
  type MigrationRegion,
} from "@/lib/migration-region";

export const runtime = "nodejs";

const buildingDeletionSchema = z.object({
  aksi: z.literal("DELETE"),
  kode: z.coerce.number().int().positive(),
  alasan: z.string().trim().min(3, "Alasan penghapusan wajib diisi").max(500),
  keterangan: z.string().trim().max(500).optional(),
});

function ageFromDate(value: unknown) {
  const date = value instanceof Date ? value : value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const beforeBirthday =
    now.getMonth() < date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() < date.getDate());
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
}

function withDerivedPersonFields(data: Record<string, unknown>, index: number) {
  const age = ageFromDate(data.tgl_lahir);
  return {
    ...data,
    abs_id: data.abs_id || `ABS-${Date.now()}-${index}-${Math.floor(Math.random() * 10_000)}`,
    ...(age === undefined ? {} : { usia: age, usia_dec: age }),
  };
}

async function nextBuildingCode(tx: Prisma.TransactionClient, desaId: string) {
  const [maxBuilding, maxLegacyBuilding, staged] = await Promise.all([
    tx.bangunan.aggregate({ where: { desaId }, _max: { kode: true } }),
    // Existing installations only stored the building code on resident rows.
    // Include that legacy baseline so a newly digitized building can never reuse
    // a code that already identifies an occupied house.
    tx.penduduk.aggregate({ where: { desaId }, _max: { kode_bangunan: true } }),
    tx.stagingChange.findMany({
      where: { desaId, entityType: "BANGUNAN", aksi: "CREATE", status: "PENDING" },
      select: { data: true },
    }),
  ]);
  const stagedCodes = staged.flatMap((row) => {
    try {
      const code = Number((JSON.parse(row.data ?? "{}") as { kode?: unknown }).kode);
      return Number.isSafeInteger(code) ? [code] : [];
    } catch {
      return [];
    }
  });
  // Kode bangunan unik dalam satu desa. Mulai dari 1 pada desa kosong dan
  // lanjutkan setelah kode terbesar yang sudah ada pada baseline atau staging.
  return Math.max(0, maxBuilding._max.kode ?? 0, maxLegacyBuilding._max.kode_bangunan ?? 0, ...stagedCodes) + 1;
}

async function stageBuildingDeletion(
  desaId: string,
  actor: { userId: string; userName: string; userEmail: string },
  data: z.infer<typeof buildingDeletionSchema>
) {
  return prisma.$transaction(async (tx) => {
    const [building, occupants, tombstone, pending, pendingResidents] = await Promise.all([
      tx.bangunan.findFirst({
        where: { desaId, kode: data.kode },
        select: { jenis: true, kategori: true, alamat: true, dusun: true, rw: true, rt: true },
      }),
      tx.penduduk.findMany({
        where: { desaId, kode_bangunan: data.kode, statusAktif: true },
        select: { nkk: true, alamat: true, dusun: true, rw: true, rt: true },
      }),
      tx.bangunanDihapus.findUnique({ where: { desaId_kodeBangunan: { desaId, kodeBangunan: data.kode } }, select: { id: true } }),
      tx.stagingChange.findMany({
        where: { desaId, entityType: "BANGUNAN", aksi: "DELETE", status: "PENDING" },
        select: { data: true },
      }),
      tx.stagingChange.findMany({
        where: { desaId, entityType: "PENDUDUK", status: "PENDING" },
        select: { data: true },
      }),
    ]);
    if (tombstone) throw new Error("Bangunan ini sudah dihapus dari peta aktif");
    const pendingForCode = pending.some((change) => {
      try { return Number((JSON.parse(change.data ?? "{}") as { kode?: unknown }).kode) === data.kode; } catch { return false; }
    });
    if (pendingForCode) throw new Error("Penghapusan bangunan ini sudah menunggu penggabungan");
    const pendingResidentChange = pendingResidents.some((change) => {
      try { return Number((JSON.parse(change.data ?? "{}") as { kode_bangunan?: unknown }).kode_bangunan) === data.kode; } catch { return false; }
    });
    if (pendingResidentChange) throw new Error("Bangunan ini masih memiliki perubahan penghuni yang menunggu penggabungan. Selesaikan atau batalkan perubahan tersebut terlebih dahulu.");
    if (!building && occupants.length === 0) throw new Error("Bangunan tidak ditemukan pada desa ini");

    const reference = building ?? occupants[0];
    const jumlahKk = new Set(occupants.map((resident) => resident.nkk).filter(Boolean)).size;
    const change = await tx.stagingChange.create({
      data: {
        desaId,
        entityType: "BANGUNAN",
        aksi: "DELETE",
        ringkasan: `Penghapusan bangunan #${data.kode} diajukan; ${jumlahKk} KK dan ${occupants.length} penduduk tetap tersimpan.`,
        data: JSON.stringify({
          kode: data.kode,
          alasan: data.alasan,
          keterangan: data.keterangan || null,
          jenis: building?.jenis ?? "BERPENGHUNI",
          kategori: building?.kategori ?? null,
          alamat: reference?.alamat ?? null,
          dusun: reference?.dusun ?? null,
          rw: reference?.rw ?? null,
          rt: reference?.rt ?? null,
          jumlahKk,
          jumlahPenduduk: occupants.length,
        }),
        createdBy: actor.userId,
        createdByName: actor.userName,
        createdByEmail: actor.userEmail,
      },
    });
    return { change, jumlahKk, jumlahPenduduk: occupants.length };
  }, { isolationLevel: "Serializable", timeout: 20_000 });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;

  const raw = await req.json().catch(() => null);
  if (raw && typeof raw === "object" && (raw as { aksi?: unknown }).aksi === "DELETE") {
    const deletion = buildingDeletionSchema.safeParse(raw);
    if (!deletion.success) {
      return NextResponse.json({ error: deletion.error.issues[0]?.message ?? "Data penghapusan bangunan belum lengkap" }, { status: 400 });
    }
    try {
      const result = await stageBuildingDeletion(ctx.desaId, ctx, deletion.data);
      return NextResponse.json({ data: result }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Penghapusan bangunan gagal diajukan" }, { status: 400 });
    }
  }
  const submitted = buildingSubmissionSchema.safeParse(raw);
  if (!submitted.success) {
    return NextResponse.json(
      { error: "Data bangunan belum lengkap", fields: flattenZodError(submitted.error) },
      { status: 400 }
    );
  }

  let spatial: ReturnType<typeof validateAndSerializePolygon>;
  try {
    spatial = validateAndSerializePolygon(submitted.data.building.points);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Polygon tidak valid" },
      { status: 400 }
    );
  }

  const normalizedEventData: Record<string, unknown> | undefined = submitted.data.eventData
    ? { ...submitted.data.eventData }
    : undefined;
  if (submitted.data.eventType === "MIGRASI_MASUK" && normalizedEventData) {
    const region: MigrationRegion = {
      desaKelurahan: String(normalizedEventData.desaKelurahan ?? ""),
      kecamatan: String(normalizedEventData.kecamatan ?? ""),
      kabupatenKota: String(normalizedEventData.kabupatenKota ?? ""),
      provinsi: String(normalizedEventData.provinsi ?? ""),
    };
    normalizedEventData.asal = migrationRegionLabel(region);
    normalizedEventData.wilayahKodeDeskel = generatedMigrationRegionKey(region);
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const desa = await tx.desa.findUnique({ where: { id: ctx.desaId } });
        if (!desa) throw new Error("Desa pengguna tidak ditemukan");
        const code = await nextBuildingCode(tx, ctx.desaId);
        const groupId = randomUUID();
        const building = submitted.data.building;

        const buildingPayload = {
          kode: code,
          jenis: building.jenis,
          kategori: building.jenis === "TIDAK_BERPENGHUNI" ? building.kategori ?? null : null,
          keterangan: building.keterangan || null,
          fotoUrl: building.fotoUrl || null,
          polygon: spatial.polygon,
          centroidLat: spatial.centroidLat,
          centroidLng: spatial.centroidLng,
          dusun: building.dusun,
          rw: building.rw,
          rt: building.rt,
          alamat: building.alamat || null,
        };

        await tx.stagingChange.create({
          data: {
            desaId: ctx.desaId,
            entityType: "BANGUNAN",
            groupId,
            aksi: "CREATE",
            ringkasan:
              building.jenis === "BERPENGHUNI"
                ? `Bangunan berpenghuni baru #${code}`
                : `${building.kategori} baru #${code}`,
            data: JSON.stringify(buildingPayload),
            createdBy: ctx.userId,
            createdByName: ctx.userName,
            createdByEmail: ctx.userEmail,
          },
        });

        if (building.jenis === "TIDAK_BERPENGHUNI") {
          return { groupId, code, occupantCount: 0 };
        }

        const headInput = submitted.data.head ?? {};
        const memberInputs = submitted.data.members;
        const nkk = typeof headInput.nkk === "string" ? headInput.nkk : "";
        const headName = typeof headInput.nama === "string" ? headInput.nama : "";
        const respondent = submitted.data.respondent;
        if (!respondent) throw new Error("Nama dan foto responden wajib diisi");
        const respondentMedia = await tx.mediaAsset.findFirst({
          where: { id: respondent.mediaAssetId, desaId: ctx.desaId, purpose: "RESPONDEN" },
        });
        if (!respondentMedia || respondent.fotoUrl !== `/api/media/${respondentMedia.id}`) {
          throw new Error("Foto responden tidak valid untuk desa ini");
        }
        const totalFamily = memberInputs.length + 1;
        const shared = {
          kode_bangunan: code,
          kode_deskel: desa.kodeWilayah ?? undefined,
          deskel: desa.nama,
          dusun: building.dusun,
          rw: building.rw,
          rt: building.rt,
          lat: spatial.centroidLat.toFixed(7),
          lng: spatial.centroidLng.toFixed(7),
          alamat: building.alamat || `${building.dusun}, RW ${building.rw}/RT ${building.rt}`,
          nkk,
          nama_kepala_rumah: headName,
          jml_keluarga: totalFamily,
          datamasuk: new Date(),
          enumerator: ctx.userName,
          responden: respondent.nama,
          kesediaan: "Ya",
        };

        const headParsed = pendudukCreateSchema.safeParse(
          withDerivedPersonFields(
            {
              ...headInput,
              ...shared,
              subjek: "Keluarga",
              status_dalam_keluarga: "Kepala Keluarga",
            },
            0
          )
        );
        if (!headParsed.success) {
          const error = new Error("Data kepala keluarga belum lengkap") as Error & { fields?: Record<string, string> };
          error.fields = flattenZodError(headParsed.error);
          throw error;
        }

        const residents = [headParsed.data];
        for (let index = 0; index < memberInputs.length; index += 1) {
          const member = memberInputs[index];
          const status = member.status_dalam_keluarga;
          if (!status || status === "Kepala Keluarga") {
            const error = new Error(`Status anggota ${index + 1} dalam keluarga belum valid`) as Error & { fields?: Record<string, string> };
            error.fields = { [`members.${index}.status_dalam_keluarga`]: "Pilih status anggota dalam keluarga" };
            throw error;
          }
          const inherited = Object.fromEntries(
            HOUSEHOLD_INHERITED_FIELDS.flatMap((field) =>
              headParsed.data[field as keyof typeof headParsed.data] !== undefined
                ? [[field, headParsed.data[field as keyof typeof headParsed.data]]]
                : []
            )
          );
          const parsed = pendudukCreateSchema.safeParse(
            withDerivedPersonFields(
              {
                ...member,
                // Household answers are authoritative from the head. Keep this
                // spread after member input so direct API calls cannot diverge.
                ...inherited,
                ...shared,
                subjek: "Individu",
                status_dalam_keluarga: status,
              },
              index + 1
            )
          );
          if (!parsed.success) {
            const error = new Error(`Data anggota keluarga ${index + 1} belum lengkap`) as Error & { fields?: Record<string, string> };
            error.fields = Object.fromEntries(
              Object.entries(flattenZodError(parsed.error)).map(([key, message]) => [`members.${index}.${key}`, message])
            );
            throw error;
          }
          residents.push(parsed.data);
        }

        const niks = residents.map((resident) => String(resident.nik));
        if (new Set(niks).size !== niks.length) {
          const error = new Error("NIK penghuni tidak boleh duplikat") as Error & { fields?: Record<string, string> };
          error.fields = { nik: "Ada NIK yang sama dalam satu keluarga" };
          throw error;
        }
        const [baselineDupes, stagingDupes, existingNkk, pendingFamilies] = await Promise.all([
          tx.penduduk.findMany({ where: { nik: { in: niks } }, select: { nik: true } }),
          tx.stagingChange.findMany({
            where: { entityType: "PENDUDUK", status: "PENDING", nik: { in: niks } },
            select: { nik: true },
          }),
          tx.penduduk.count({ where: { desaId: ctx.desaId, nkk } }),
          tx.stagingChange.findMany({
            where: {
              desaId: ctx.desaId,
              entityType: "PENDUDUK",
              aksi: "CREATE",
              status: "PENDING",
            },
            select: { data: true },
          }),
        ]);
        const duplicateNik = baselineDupes[0]?.nik ?? stagingDupes[0]?.nik;
        if (duplicateNik) {
          const error = new Error("NIK sudah terdaftar") as Error & { fields?: Record<string, string> };
          error.fields = { nik: `NIK ${duplicateNik} sudah ada di baseline/perubahan sementara` };
          throw error;
        }
        if (existingNkk > 0) {
          const error = new Error("Nomor KK sudah terdaftar") as Error & { fields?: Record<string, string> };
          error.fields = { nkk: "Gunakan menu Tambah Anggota Keluarga untuk KK yang sudah disensus" };
          throw error;
        }
        const pendingNkk = pendingFamilies.some((change) => {
          try {
            return (JSON.parse(change.data ?? "{}") as { nkk?: unknown }).nkk === nkk;
          } catch {
            return false;
          }
        });
        if (pendingNkk) {
          const error = new Error("Nomor KK sudah ada di perubahan sementara") as Error & { fields?: Record<string, string> };
          error.fields = { nkk: "Periksa grup penambahan keluarga yang masih menunggu penggabungan" };
          throw error;
        }

        await tx.stagingChange.createMany({
          data: residents.map((resident, index) => ({
            desaId: ctx.desaId,
            entityType: "PENDUDUK",
            groupId,
            aksi: "CREATE",
            nik: String(resident.nik),
            nama: typeof resident.nama === "string" ? resident.nama : null,
            ringkasan:
              submitted.data.eventType === "MIGRASI_MASUK"
                ? `Migrasi masuk ${index === 0 ? "kepala" : "anggota"} keluarga pada bangunan baru #${code}`
                : index === 0
                ? `Kepala keluarga baru pada bangunan #${code}`
                : `Anggota keluarga baru pada bangunan #${code}`,
            data: JSON.stringify(resident),
            eventType: submitted.data.eventType,
            eventData: normalizedEventData ? JSON.stringify(normalizedEventData) : null,
            createdBy: ctx.userId,
            createdByName: ctx.userName,
            createdByEmail: ctx.userEmail,
          })),
        });
        await registerIncompleteFamily(tx, {
          desaId: ctx.desaId,
          nkk,
          kodeBangunan: code,
          stagingGroupId: groupId,
          userId: ctx.userId,
          userName: ctx.userName,
        });

        const [latestSession, latestSnapshot] = await Promise.all([
          tx.sesiPendataanBangunan.findFirst({
            where: { desaId: ctx.desaId, kodeBangunan: code },
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
            kodeBangunan: code,
            stagingGroupId: groupId,
            periode: latestSnapshot?.kode ?? "T0",
            namaResponden: respondent.nama,
            fotoRespondenUrl: respondent.fotoUrl,
            mediaAssetId: respondentMedia.id,
            enumeratorId: ctx.userId,
            enumeratorName: ctx.userName,
            enumeratorEmail: ctx.userEmail || null,
            supersedesId: latestSession?.id ?? null,
          },
        });

        return { groupId, code, occupantCount: residents.length };
      },
      { isolationLevel: "Serializable", timeout: 30_000 }
    );

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const known = error as Error & { fields?: Record<string, string> };
    return NextResponse.json(
      { error: known.message || "Gagal menyimpan bangunan", fields: known.fields ?? {} },
      { status: 400 }
    );
  }
}
