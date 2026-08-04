import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pendudukCreateSchema, pendudukUpdateSchema } from "@/lib/validation";

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
  const [baseline, buildings] = await Promise.all([
    db.penduduk.findMany({ where: { desaId } }),
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
  ]);
  const buildingCodes = new Set<number>();
  for (const row of baseline) {
    if (row.kode_bangunan !== null) buildingCodes.add(row.kode_bangunan);
  }
  for (const building of buildings) buildingCodes.add(building.kode);

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

  for (let i = 0; i < buildings.length; i += BATCH) {
    await db.snapshotBangunan.createMany({
      data: buildings.slice(i, i + BATCH).map((building) => ({
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
    "PENDUDUK:CREATE": "penduduk baru",
    "PENDUDUK:UPDATE": "data diperbarui",
    "PENDUDUK:DELETE": "data dihapus",
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
  return prisma.$transaction(
    async (tx) => {
      const pending = await tx.stagingChange.findMany({
        where: { desaId, status: "PENDING" },
        orderBy: { createdAt: "asc" },
      });
      if (pending.length === 0) return { applied: 0, snapshot: null };

      const ordered = [...pending].sort((a, b) => {
        if (a.entityType === b.entityType) return a.createdAt.getTime() - b.createdAt.getTime();
        return a.entityType === "BANGUNAN" ? -1 : 1;
      });
      const affectedNkk = new Set<string>();

      for (const change of ordered) {
        if (change.entityType === "BANGUNAN") {
          if (change.aksi !== "CREATE" || !change.data) {
            throw new Error(`Perubahan bangunan ${change.id} tidak valid`);
          }
          const data = JSON.parse(change.data) as Prisma.BangunanUncheckedCreateInput;
          await tx.bangunan.create({
            data: {
              ...data,
              desaId,
              createdBy: change.createdBy ?? actor.userId,
              createdByName: change.createdByName ?? actor.userName,
            },
          });
          continue;
        }

        if (change.aksi === "CREATE" && change.data) {
          const parsed = pendudukCreateSchema.parse(JSON.parse(change.data));
          await tx.penduduk.create({ data: { ...parsed, desaId } as never });
          if (typeof parsed.nkk === "string" && parsed.nkk) affectedNkk.add(parsed.nkk);
        } else if (change.aksi === "UPDATE" && change.pendudukId && change.data) {
          const parsed = pendudukUpdateSchema.parse(JSON.parse(change.data));
          const current = await tx.penduduk.findFirstOrThrow({
            where: { id: change.pendudukId, desaId },
            select: { nkk: true },
          });
          await tx.penduduk.updateMany({
            where: { id: change.pendudukId, desaId },
            data: parsed as never,
          });
          if (current.nkk) affectedNkk.add(current.nkk);
          if (typeof parsed.nkk === "string" && parsed.nkk) affectedNkk.add(parsed.nkk);
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
        const count = await tx.penduduk.count({ where: { desaId, nkk } });
        if (count === 0) continue;
        const headCount = await tx.penduduk.count({
          where: { desaId, nkk, status_dalam_keluarga: "Kepala Keluarga" },
        });
        if (headCount !== 1) {
          throw new Error(`Keluarga ${nkk} harus memiliki tepat satu kepala keluarga`);
        }
        await tx.penduduk.updateMany({ where: { desaId, nkk }, data: { jml_keluarga: count } });
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
}
