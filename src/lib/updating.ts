import { prisma } from "@/lib/prisma";

// Freeze the current live baseline of one desa as its next immutable snapshot.
export async function createSnapshotFromBaseline(desaId: string, label?: string) {
  const max = await prisma.snapshot.aggregate({ where: { desaId }, _max: { urutan: true } });
  const nextUrutan = (max._max.urutan ?? -1) + 1;
  const kode = `T${nextUrutan}`;
  const baseline = await prisma.penduduk.findMany({ where: { desaId } });
  const snap = await prisma.snapshot.create({
    data: {
      desaId,
      kode,
      urutan: nextUrutan,
      label: label ?? `Baseline ${kode}`,
      jumlah: baseline.length,
    },
  });
  const BATCH = 50;
  for (let i = 0; i < baseline.length; i += BATCH) {
    const batch = baseline.slice(i, i + BATCH);
    await prisma.snapshotPenduduk.createMany({
      data: batch.map((r) => ({
        snapshotId: snap.id,
        nik: r.nik,
        nkk: r.nkk,
        nama: r.nama,
        dusun: r.dusun,
        data: JSON.stringify(r),
      })),
    });
  }
  return snap;
}

// Apply every PENDING staged change of one desa to its baseline, then snapshot.
export async function mergeStaging(desaId: string) {
  const pending = await prisma.stagingChange.findMany({
    where: { desaId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  if (pending.length === 0) return { applied: 0, snapshot: null };

  for (const c of pending) {
    try {
      if (c.aksi === "CREATE" && c.data) {
        await prisma.penduduk.create({ data: { ...JSON.parse(c.data), desaId } as never });
      } else if (c.aksi === "UPDATE" && c.pendudukId && c.data) {
        await prisma.penduduk.updateMany({ where: { id: c.pendudukId, desaId }, data: JSON.parse(c.data) as never });
      } else if (c.aksi === "DELETE" && c.pendudukId) {
        await prisma.penduduk.deleteMany({ where: { id: c.pendudukId, desaId } });
      }
    } catch {
      // Skip a change that no longer applies.
    }
  }

  const snap = await createSnapshotFromBaseline(desaId);
  await prisma.stagingChange.updateMany({
    where: { desaId, status: "PENDING" },
    data: { status: "MERGED" },
  });
  return { applied: pending.length, snapshot: snap };
}
