import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  REQUIRED_FIELDS,
  pendudukCreateSchema,
  pendudukUpdateSchema,
} from "@/lib/validation";
import { recordFieldUpdate } from "@/lib/field-updates";
import {
  HOUSEHOLD_INHERITED_FIELDS,
  LOCATION_INHERITED_FIELDS,
  isHouseholdField,
} from "@/lib/survey";
import { invalidatePeriodicUpdatingCache } from "@/lib/updating-cache";
import { mapping } from "@/lib/indikator";

type AuditActor = {
  userId: string;
  userName: string;
  userEmail: string;
};

type SnapshotOptions = {
  label?: string;
  changeCount?: number;
  changeSummary?: string;
  changeActors?: string;
  actor?: AuditActor;
};

async function snapshotWithClient(
  db: Prisma.TransactionClient,
  desaId: string,
  options: SnapshotOptions = {}
) {
  const max = await db.snapshot.aggregate({ where: { desaId }, _max: { urutan: true } });
  const nextUrutan = (max._max.urutan ?? -1) + 1;
  const kode = `T${nextUrutan}`;
  const [baseline, buildings, deletedBuildings] = await Promise.all([
    db.penduduk.findMany({ where: { desaId, statusAktif: true } }),
    db.bangunan.findMany({
      where: { desaId },
      // Photos may be inline data URLs in the current deployment. Keep one
      // canonical copy on Bangunan instead of multiplying large blobs into
      // every immutable snapshot.
      select: {
        id: true,
        desaId: true,
        kode: true,
        jenis: true,
        kategori: true,
        keterangan: true,
        polygon: true,
        centroidLat: true,
        centroidLng: true,
        dusun: true,
        rw: true,
        rt: true,
        alamat: true,
        createdBy: true,
        createdByName: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.bangunanDihapus.findMany({ where: { desaId }, select: { kodeBangunan: true } }),
  ]);
  const deletedCodes = new Set(deletedBuildings.map((building) => building.kodeBangunan));
  const activeBuildings = buildings.filter((building) => !deletedCodes.has(building.kode));
  const buildingCodes = new Set<number>();
  for (const row of baseline) {
    if (row.kode_bangunan !== null && !deletedCodes.has(row.kode_bangunan)) buildingCodes.add(row.kode_bangunan);
  }
  for (const building of activeBuildings) buildingCodes.add(building.kode);

  const snap = await db.snapshot.create({
    data: {
      desaId,
      kode,
      urutan: nextUrutan,
      label: options.label ?? `Baseline ${kode}`,
      jumlah: baseline.length,
      // A migrated desa can still have legacy buildings represented only by
      // Penduduk.kode_bangunan. Count the union so history remains accurate.
      jumlahBangunan: buildingCodes.size,
      changeCount: options.changeCount ?? 0,
      changeSummary: options.changeSummary,
      changeActors: options.changeActors,
      createdBy: options.actor?.userId,
      createdByName: options.actor?.userName,
      createdByEmail: options.actor?.userEmail,
    },
  });

  const BATCH = 100;
  for (let i = 0; i < baseline.length; i += BATCH) {
    await db.snapshotPenduduk.createMany({
      data: baseline.slice(i, i + BATCH).map((row) => ({
        snapshotId: snap.id,
        nik: row.nik,
        nkk: row.nkk,
        nama: row.nama,
        dusun: row.dusun,
        data: JSON.stringify(row),
      })),
    });
  }

  for (let i = 0; i < activeBuildings.length; i += BATCH) {
    await db.snapshotBangunan.createMany({
      data: activeBuildings.slice(i, i + BATCH).map((building) => ({
        snapshotId: snap.id,
        kode: building.kode,
        jenis: building.jenis,
        data: JSON.stringify(building),
      })),
    });
  }

  return snap;
}

// Freeze the current live baseline of one desa as its next immutable snapshot.
export async function createSnapshotFromBaseline(desaId: string, options: SnapshotOptions = {}) {
  return prisma.$transaction(
    (tx) => snapshotWithClient(tx, desaId, options),
    { isolationLevel: "Serializable", timeout: 30_000 }
  );
}

function summarizeChanges(changes: { entityType: string; aksi: string }[]) {
  const labels: Record<string, string> = {
    "BANGUNAN:CREATE": "bangunan baru",
    "BANGUNAN:DELETE": "bangunan dihapus secara fisik",
    "PENDUDUK:CREATE": "penduduk baru",
    "PENDUDUK:UPDATE": "data diperbarui",
    "PENDUDUK:DELETE": "data dihapus",
    "PERISTIWA:EVENT": "peristiwa kependudukan",
  };
  const counts = new Map<string, number>();
  for (const change of changes) {
    const key = `${change.entityType}:${change.aksi}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => `${count} ${labels[key] ?? "perubahan"}`)
    .join(", ");
}

function buildingCodeFromChangeData(data: string | null) {
  try {
    const code = Number((JSON.parse(data ?? "{}") as { kode?: unknown }).kode);
    return Number.isSafeInteger(code) && code > 0 ? code : null;
  } catch {
    return null;
  }
}

function parseEventData(value: string | null) {
  if (!value) return {} as Record<string, unknown>;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function eventDate(details: Record<string, unknown>) {
  const date = details.tanggal ? new Date(String(details.tanggal)) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error("Tanggal peristiwa tidak valid");
  if (date.getTime() > Date.now()) throw new Error("Tanggal peristiwa tidak boleh di masa depan");
  return date;
}

function eventRegionColumns(details: Record<string, unknown>) {
  return {
    wilayahDeskel:
      typeof details.desaKelurahan === "string" ? details.desaKelurahan : null,
    wilayahKecamatan:
      typeof details.kecamatan === "string" ? details.kecamatan : null,
    wilayahKabkota:
      typeof details.kabupatenKota === "string" ? details.kabupatenKota : null,
    wilayahProvinsi:
      typeof details.provinsi === "string" ? details.provinsi : null,
    wilayahKodeDeskel:
      typeof details.wilayahKodeDeskel === "string" ? details.wilayahKodeDeskel : null,
  };
}

function normalizeStoredRecord(raw: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(raw).map(([field, value]) => {
      if (value !== null && value !== undefined && mapping.kolom[field]?.tipe === "date") {
        const date = value instanceof Date ? value : new Date(String(value));
        if (Number.isNaN(date.getTime())) throw new Error(`Tanggal ${field} pada staging tidak valid`);
        return [field, date];
      }
      return [field, value];
    }),
  );
}

function parseStagedResidentCreate(value: string) {
  const raw = JSON.parse(value) as Record<string, unknown>;
  if (raw.subjek !== "Individu") return pendudukCreateSchema.parse(raw);

  const inherited = new Set<string>([
    ...HOUSEHOLD_INHERITED_FIELDS,
    ...LOCATION_INHERITED_FIELDS,
    "responden",
    "kesediaan",
  ]);
  const submitted = Object.fromEntries(
    Object.entries(raw).filter(([field]) => !inherited.has(field)),
  );
  const parsedSubmitted = pendudukUpdateSchema.parse(submitted);
  const normalized = {
    ...normalizeStoredRecord(raw),
    ...parsedSubmitted,
  } as Record<string, unknown>;
  const missing = [...REQUIRED_FIELDS].filter((field) => {
    const fieldValue = normalized[field];
    return fieldValue === undefined || fieldValue === null || fieldValue === "";
  });
  if (missing.length) throw new Error(`Data penduduk belum lengkap: ${missing.join(", ")}`);
  return normalized;
}

async function recordFieldUpdates(
  tx: Prisma.TransactionClient,
  desaId: string,
  pendudukId: string,
  nkk: string | null,
  data: Record<string, unknown>,
  actor: AuditActor,
  stagingChangeId: string,
  updatedAt = new Date()
) {
  const fields = Object.entries(data).filter(([, value]) => value !== null && value !== undefined && value !== "");
  for (const [field] of fields) {
    await recordFieldUpdate(tx, {
      desaId,
      pendudukId,
      nkk,
      field,
      scope: isHouseholdField(field) ? "FAMILY" : "PERSON",
      source: "EDIT",
      actor,
      stagingChangeId,
      updatedAt,
    });
  }
}

function summarizeActors(
  changes: { createdByName: string | null; createdByEmail: string | null; createdAt: Date }[]
) {
  const actors = new Map<
    string,
    { name: string; email: string | null; firstAt: string; lastAt: string; count: number }
  >();
  for (const change of changes) {
    const name = change.createdByName ?? "Operator Desa";
    const key = change.createdByEmail || name;
    const timestamp = change.createdAt.toISOString();
    const current = actors.get(key);
    if (current) {
      current.lastAt = timestamp;
      current.count += 1;
    } else {
      actors.set(key, {
        name,
        email: change.createdByEmail,
        firstAt: timestamp,
        lastAt: timestamp,
        count: 1,
      });
    }
  }
  return JSON.stringify([...actors.values()]);
}

// Apply a captured set of pending changes atomically, then freeze a snapshot.
// Any invalid row rolls the whole merge back so a building cannot be separated
// from its occupants and no change is silently lost.
export async function mergeStaging(desaId: string, actor: AuditActor) {
  const result = await prisma.$transaction(
    async (tx) => {
      const pending = await tx.stagingChange.findMany({
        where: { desaId, status: "PENDING" },
        orderBy: { createdAt: "asc" },
      });
      if (pending.length === 0) return { applied: 0, snapshot: null };

      // A physical-building removal must not be merged beside a newly added
      // resident that still points at that building. The normal UI blocks this
      // situation, and this second check also protects direct/API submissions
      // made while a deletion is waiting in Data Perubahan Sementara.
      const pendingDeletedBuildingCodes = new Set(
        pending.flatMap((change) =>
          change.entityType === "BANGUNAN" && change.aksi === "DELETE"
            ? [buildingCodeFromChangeData(change.data)].filter((code): code is number => code !== null)
            : []
        )
      );

      const ordered = [...pending].sort((a, b) => {
        if (a.entityType === b.entityType) return a.createdAt.getTime() - b.createdAt.getTime();
        return a.entityType === "BANGUNAN" ? -1 : 1;
      });
      const affectedNkk = new Set<string>();

      for (const change of ordered) {
        if (change.entityType === "BANGUNAN") {
          if (!change.data) throw new Error(`Perubahan bangunan ${change.id} tidak valid`);
          if (change.aksi === "CREATE") {
            const data = JSON.parse(change.data) as Prisma.BangunanUncheckedCreateInput;
            await tx.bangunan.create({
              data: {
                ...data,
                desaId,
                createdBy: change.createdBy ?? actor.userId,
                createdByName: change.createdByName ?? actor.userName,
              },
            });
          } else if (change.aksi === "DELETE") {
            const data = JSON.parse(change.data) as { kode?: unknown; alasan?: unknown; keterangan?: unknown };
            const kodeBangunan = typeof data.kode === "number" ? data.kode : Number(data.kode);
            if (!Number.isSafeInteger(kodeBangunan) || kodeBangunan <= 0 || typeof data.alasan !== "string" || !data.alasan.trim()) {
              throw new Error(`Data penghapusan bangunan ${change.id} tidak valid`);
            }
            const exists = await tx.bangunanDihapus.findUnique({
              where: { desaId_kodeBangunan: { desaId, kodeBangunan } },
              select: { id: true },
            });
            if (exists) throw new Error(`Bangunan #${kodeBangunan} sudah dihapus dari peta aktif`);
            await tx.bangunanDihapus.create({
              data: {
                desaId,
                kodeBangunan,
                alasan: data.alasan.trim(),
                keterangan: typeof data.keterangan === "string" && data.keterangan.trim() ? data.keterangan.trim() : null,
                stagingChangeId: change.id,
                deletedBy: change.createdBy ?? actor.userId,
                deletedByName: change.createdByName ?? actor.userName,
                deletedByEmail: change.createdByEmail ?? actor.userEmail,
              },
            });
          } else {
            throw new Error(`Perubahan bangunan ${change.id} tidak valid`);
          }
          continue;
        }

        if (change.entityType === "PERISTIWA") {
          const details = parseEventData(change.eventData);
          const tanggal = eventDate(details);
          const targetIds = Array.isArray(details.pendudukIds)
            ? details.pendudukIds.map(String)
            : change.pendudukId
              ? [change.pendudukId]
              : [];
          if (!change.eventType || targetIds.length === 0) {
            throw new Error(`Peristiwa ${change.id} tidak lengkap`);
          }
          const targets = await tx.penduduk.findMany({
            where: { id: { in: targetIds }, desaId, statusAktif: true },
          });
          if (targets.length !== targetIds.length) throw new Error("Penduduk pada peristiwa tidak ditemukan atau sudah nonaktif");

          const replacementId = typeof details.replacementId === "string" ? details.replacementId : null;
          const replacement = replacementId
            ? await tx.penduduk.findFirst({ where: { id: replacementId, desaId, statusAktif: true } })
            : null;

          for (const target of targets) {
            if (target.nkk) affectedNkk.add(target.nkk);
            if (target.status_dalam_keluarga === "Kepala Keluarga") {
              const remaining = await tx.penduduk.count({
                where: { desaId, nkk: target.nkk, statusAktif: true, id: { notIn: targetIds } },
              });
              if (remaining > 0 && (!replacement || replacement.nkk !== target.nkk || targetIds.includes(replacement.id))) {
                throw new Error(`Pilih kepala keluarga pengganti untuk keluarga ${target.nkk}`);
              }
            }

            if (change.eventType === "KEMATIAN") {
              await tx.kematian.create({
                data: {
                  desaId,
                  pendudukIdAsal: target.id,
                  nik: target.nik,
                  nkk: target.nkk,
                  nama: target.nama,
                  tanggal,
                  penyebab: typeof details.penyebab === "string" ? details.penyebab : null,
                  punyaAkta: typeof details.punyaAkta === "string" ? details.punyaAkta : null,
                  nomorAkta: typeof details.nomorAkta === "string" ? details.nomorAkta : null,
                  dataPenduduk: JSON.stringify(target),
                  createdBy: change.createdBy ?? actor.userId,
                  createdByName: change.createdByName ?? actor.userName,
                  createdByEmail: change.createdByEmail ?? actor.userEmail,
                },
              });
              await tx.peristiwaKependudukan.create({
                data: {
                  desaId,
                  jenis: "KEMATIAN",
                  tanggal,
                  pendudukId: target.id,
                  nik: target.nik,
                  nkk: target.nkk,
                  nama: target.nama,
                  data: JSON.stringify(details),
                  ...eventRegionColumns(details),
                  createdBy: change.createdBy ?? actor.userId,
                  createdByName: change.createdByName ?? actor.userName,
                  createdByEmail: change.createdByEmail ?? actor.userEmail,
                },
              });
              await tx.fieldUpdate.deleteMany({ where: { pendudukId: target.id } });
              await tx.penduduk.delete({ where: { id: target.id } });
              if (target.nkk) {
                await tx.penduduk.updateMany({
                  where: { desaId, nkk: target.nkk, statusAktif: true },
                  data: { dead_jml: (target.dead_jml ?? 0) + 1 },
                });
              }
            } else if (change.eventType === "MIGRASI_KELUAR") {
              await tx.penduduk.update({
                where: { id: target.id },
                data: { statusAktif: false, inactiveReason: "MIGRASI_KELUAR", inactiveAt: tanggal },
              });
              await tx.peristiwaKependudukan.create({
                data: {
                  desaId,
                  jenis: "MIGRASI_KELUAR",
                  tanggal,
                  pendudukId: target.id,
                  nik: target.nik,
                  nkk: target.nkk,
                  nama: target.nama,
                  data: JSON.stringify(details),
                  ...eventRegionColumns(details),
                  createdBy: change.createdBy ?? actor.userId,
                  createdByName: change.createdByName ?? actor.userName,
                  createdByEmail: change.createdByEmail ?? actor.userEmail,
                },
              });
            } else {
              throw new Error(`Jenis peristiwa ${change.eventType} tidak dikenali`);
            }
          }

          if (replacement) {
            await tx.penduduk.update({
              where: { id: replacement.id },
              data: { status_dalam_keluarga: "Kepala Keluarga" },
            });
            if (replacement.nkk) {
              await tx.penduduk.updateMany({
                where: { desaId, nkk: replacement.nkk, statusAktif: true },
                data: { nama_kepala_rumah: replacement.nama },
              });
            }
          }
          continue;
        }

        if (change.aksi === "CREATE" && change.data) {
          const parsed = parseStagedResidentCreate(change.data);
          if (
            typeof parsed.kode_bangunan === "number" &&
            pendingDeletedBuildingCodes.has(parsed.kode_bangunan)
          ) {
            throw new Error(`Bangunan #${parsed.kode_bangunan} sedang diajukan untuk dihapus. Pindahkan atau batalkan perubahan keluarga terlebih dahulu.`);
          }
          const created = await tx.penduduk.create({ data: { ...parsed, desaId } as never });
          await recordFieldUpdates(
            tx,
            desaId,
            created.id,
            typeof parsed.nkk === "string" ? parsed.nkk : null,
            parsed as Record<string, unknown>,
            actor,
            change.id,
          );
          if (typeof parsed.nkk === "string" && parsed.nkk) affectedNkk.add(parsed.nkk);
          if (change.eventType === "KELAHIRAN" || change.eventType === "MIGRASI_MASUK") {
            const details = parseEventData(change.eventData);
            await tx.peristiwaKependudukan.create({
              data: {
                desaId,
                jenis: change.eventType,
                tanggal: eventDate(details),
                pendudukId: created.id,
                nik: created.nik,
                nkk: created.nkk,
                nama: created.nama,
                data: JSON.stringify(details),
                ...eventRegionColumns(details),
                createdBy: change.createdBy ?? actor.userId,
                createdByName: change.createdByName ?? actor.userName,
                createdByEmail: change.createdByEmail ?? actor.userEmail,
              },
            });
          }
        } else if (change.aksi === "UPDATE" && change.pendudukId && change.data) {
          const parsed = pendudukUpdateSchema.parse(JSON.parse(change.data));
          if (
            typeof parsed.kode_bangunan === "number" &&
            pendingDeletedBuildingCodes.has(parsed.kode_bangunan)
          ) {
            throw new Error(`Bangunan #${parsed.kode_bangunan} sedang diajukan untuk dihapus. Pilih bangunan tujuan lain terlebih dahulu.`);
          }
          const current = await tx.penduduk.findFirstOrThrow({
            where: { id: change.pendudukId, desaId },
            select: { nkk: true },
          });
          await tx.penduduk.updateMany({
            where: { id: change.pendudukId, desaId },
            data: {
              ...parsed,
              ...(change.eventType === "MIGRASI_MASUK"
                ? { statusAktif: true, inactiveReason: null, inactiveAt: null }
                : {}),
            } as never,
          });
          await recordFieldUpdates(
            tx,
            desaId,
            change.pendudukId,
            typeof parsed.nkk === "string" ? parsed.nkk : current.nkk,
            parsed as Record<string, unknown>,
            actor,
            change.id,
          );
          if (current.nkk) affectedNkk.add(current.nkk);
          if (typeof parsed.nkk === "string" && parsed.nkk) affectedNkk.add(parsed.nkk);
          if (change.eventType === "MIGRASI_MASUK") {
            const details = parseEventData(change.eventData);
            await tx.peristiwaKependudukan.create({
              data: {
                desaId,
                jenis: "MIGRASI_MASUK",
                tanggal: eventDate(details),
                pendudukId: change.pendudukId,
                nik: typeof parsed.nik === "string" ? parsed.nik : change.nik,
                nkk: typeof parsed.nkk === "string" ? parsed.nkk : current.nkk,
                nama: typeof parsed.nama === "string" ? parsed.nama : change.nama,
                data: JSON.stringify(details),
                ...eventRegionColumns(details),
                createdBy: change.createdBy ?? actor.userId,
                createdByName: change.createdByName ?? actor.userName,
                createdByEmail: change.createdByEmail ?? actor.userEmail,
              },
            });
          }
        } else if (change.aksi === "DELETE" && change.pendudukId) {
          const current = await tx.penduduk.findFirstOrThrow({
            where: { id: change.pendudukId, desaId },
            select: { nkk: true },
          });
          await tx.penduduk.deleteMany({ where: { id: change.pendudukId, desaId } });
          if (current.nkk) affectedNkk.add(current.nkk);
        } else {
          throw new Error(`Perubahan penduduk ${change.id} tidak valid`);
        }
      }

      // jml_keluarga is denormalized in the production ajaib schema. Keep it
      // consistent on every row after adding or removing a family member.
      for (const nkk of affectedNkk) {
        const count = await tx.penduduk.count({ where: { desaId, nkk, statusAktif: true } });
        if (count === 0) continue;
        const headCount = await tx.penduduk.count({
          where: { desaId, nkk, statusAktif: true, status_dalam_keluarga: "Kepala Keluarga" },
        });
        if (headCount !== 1) {
          throw new Error(`Keluarga ${nkk} harus memiliki tepat satu kepala keluarga`);
        }
        await tx.penduduk.updateMany({ where: { desaId, nkk, statusAktif: true }, data: { jml_keluarga: count } });
      }

      const summary = summarizeChanges(pending);
      const snapshot = await snapshotWithClient(tx, desaId, {
        changeCount: pending.length,
        changeSummary: summary,
        changeActors: summarizeActors(pending),
        actor,
      });
      await tx.stagingChange.updateMany({
        where: { id: { in: pending.map((change) => change.id) }, desaId, status: "PENDING" },
        data: { status: "MERGED" },
      });

      return { applied: pending.length, snapshot };
    },
    { isolationLevel: "Serializable", timeout: 60_000 }
  );
  invalidatePeriodicUpdatingCache();
  return result;
}
