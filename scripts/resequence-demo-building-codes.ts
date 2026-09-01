/**
 * Re-sequence legacy DEMO building codes (100000+) to 1..N per tenant.
 *
 * This script is intentionally opt-in. It never runs during deploy, refuses a
 * tenant that mixes small/real-looking codes with legacy demo codes, and does
 * not rewrite immutable snapshots. Run it only after a verified backup.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const LEGACY_DEMO_MIN_CODE = 100_000;
const LEGACY_REFRESHING_VALUES: Record<string, string> = {
  Ya: "1x",
  Tidak: "tidak pernah",
};
const DEFAULT_DEMO_SLUGS = [
  "desa-setu",
  "desa-gunung-putri",
  "desa-citaringgul",
  "desa-babakan-sadeng",
];

type Options = {
  apply: boolean;
  confirmDemo: boolean;
  allDemo: boolean;
  slugs: string[];
};

function usage() {
  console.log(`
Gunakan setelah backup database terverifikasi.

Dry-run satu desa:
  npm run db:resequence:demo-buildings -- --desa desa-setu

Terapkan setelah dry-run bersih:
  npm run db:resequence:demo-buildings -- --desa desa-setu --apply --confirm-demo

Empat tenant demo bawaan:
  npm run db:resequence:demo-buildings -- --all-demo --apply --confirm-demo

Catatan: alat ini hanya menerima tenant yang seluruh kode bangunannya masih
berada pada rentang dummy lama (>= ${LEGACY_DEMO_MIN_CODE}). Saat apply, nilai
dummy refreshing Ya/Tidak juga dipetakan menjadi 1x/tidak pernah. Snapshot T0/T1
tidak diubah agar riwayat tetap immutable.
`);
}

function readOptions(argv: string[]): Options {
  const options: Options = { apply: false, confirmDemo: false, allDemo: false, slugs: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      usage();
      process.exit(0);
    }
    if (argument === "--apply") options.apply = true;
    else if (argument === "--confirm-demo") options.confirmDemo = true;
    else if (argument === "--all-demo") options.allDemo = true;
    else if (argument === "--desa") {
      const slug = argv[index + 1];
      if (!slug || slug.startsWith("--")) throw new Error("--desa membutuhkan slug desa");
      options.slugs.push(slug);
      index += 1;
    } else {
      throw new Error(`Argumen tidak dikenali: ${argument}`);
    }
  }
  if (options.allDemo && options.slugs.length) throw new Error("Gunakan --all-demo atau --desa, bukan keduanya");
  if (!options.allDemo && options.slugs.length === 0) throw new Error("Tentukan --desa <slug> atau --all-demo");
  if (options.apply && !options.confirmDemo) {
    throw new Error("Mode --apply membutuhkan --confirm-demo untuk memastikan target benar-benar data dummy");
  }
  return options;
}

function numberValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function codeListLabel(codes: number[]) {
  if (codes.length <= 12) return codes.join(", ");
  return `${codes.slice(0, 6).join(", ")} ... ${codes.slice(-3).join(", ")}`;
}

function remapPayload(raw: string | null, mapping: Map<number, number>) {
  if (!raw) return { changed: false, value: raw };
  try {
    const payload = JSON.parse(raw) as Record<string, unknown>;
    let changed = false;
    for (const field of ["kode", "kode_bangunan", "kodeBangunan"]) {
      const previous = numberValue(payload[field]);
      const next = previous === null ? undefined : mapping.get(previous);
      if (next === undefined) continue;
      payload[field] = typeof payload[field] === "string" ? String(next) : next;
      changed = true;
    }
    return { changed, value: changed ? JSON.stringify(payload) : raw };
  } catch {
    // An invalid payload must not make an administrative repair corrupt it.
    return { changed: false, value: raw };
  }
}

function payloadCodes(raw: string | null) {
  if (!raw) return [];
  try {
    const payload = JSON.parse(raw) as Record<string, unknown>;
    return ["kode", "kode_bangunan", "kodeBangunan"]
      .map((field) => numberValue(payload[field]))
      .filter((code): code is number => code !== null);
  } catch {
    return [];
  }
}

function remapSummary(summary: string | null, mapping: Map<number, number>) {
  if (!summary) return summary;
  let next = summary;
  for (const [before, after] of mapping) next = next.replaceAll(`#${before}`, `#${after}`);
  return next;
}

async function resequenceDesa(desaId: string, slug: string, apply: boolean) {
  const [residentRows, buildingRows, deletedBuildingRows, stagedRows, sessionCount, progressCount, legacyRefreshing] = await Promise.all([
    prisma.penduduk.findMany({
      where: { desaId, kode_bangunan: { not: null } },
      select: { kode_bangunan: true },
      distinct: ["kode_bangunan"],
    }),
    prisma.bangunan.findMany({ where: { desaId }, select: { kode: true } }),
    prisma.bangunanDihapus.findMany({ where: { desaId }, select: { kodeBangunan: true } }),
    prisma.stagingChange.findMany({ where: { desaId, status: "PENDING" }, select: { data: true } }),
    prisma.sesiPendataanBangunan.count({ where: { desaId } }),
    prisma.progresPendataanKeluarga.count({ where: { desaId } }),
    prisma.penduduk.count({ where: { desaId, refreshing: { in: Object.keys(LEGACY_REFRESHING_VALUES) } } }),
  ]);

  const codes = new Set<number>();
  for (const row of residentRows) if (row.kode_bangunan !== null) codes.add(row.kode_bangunan);
  for (const row of buildingRows) codes.add(row.kode);
  for (const row of deletedBuildingRows) codes.add(row.kodeBangunan);
  for (const row of stagedRows) for (const code of payloadCodes(row.data)) codes.add(code);

  const oldCodes = [...codes].sort((left, right) => left - right);
  if (oldCodes.length === 0) {
    console.log(`${slug}: tidak ada kode bangunan untuk diperiksa.`);
    return;
  }
  if (oldCodes.some((code) => code < LEGACY_DEMO_MIN_CODE)) {
    throw new Error(
      `${slug}: ditemukan kode di bawah ${LEGACY_DEMO_MIN_CODE}; target tampak bercampur dengan data nyata/baru dan dibatalkan.`
    );
  }

  const mapping = new Map(oldCodes.map((code, index) => [code, index + 1]));
  console.log(
      `${slug}: ${oldCodes.length} bangunan (${codeListLabel(oldCodes)}) -> 1..${oldCodes.length}; ` +
      `${sessionCount} sesi responden, ${progressCount} progres keluarga, ${deletedBuildingRows.length} penanda bangunan dihapus, ${legacyRefreshing} nilai refreshing lama.`
  );
  if (!apply) return;

  await prisma.$transaction(async (tx) => {
    const pending = await tx.stagingChange.findMany({
      where: { desaId, status: "PENDING" },
      select: { id: true, data: true, ringkasan: true },
    });

    // `Bangunan` has a tenant/code unique constraint. Move it to negative
    // temporary values first so the final compact sequence cannot collide.
    for (const [before] of mapping) {
      await tx.bangunan.updateMany({ where: { desaId, kode: before }, data: { kode: -before } });
      await tx.bangunanDihapus.updateMany({ where: { desaId, kodeBangunan: before }, data: { kodeBangunan: -before } });
    }
    for (const [before, after] of mapping) {
      await tx.penduduk.updateMany({ where: { desaId, kode_bangunan: before }, data: { kode_bangunan: after } });
      await tx.sesiPendataanBangunan.updateMany({ where: { desaId, kodeBangunan: before }, data: { kodeBangunan: after } });
      await tx.progresPendataanKeluarga.updateMany({ where: { desaId, kodeBangunan: before }, data: { kodeBangunan: after } });
      await tx.bangunan.updateMany({ where: { desaId, kode: -before }, data: { kode: after } });
      await tx.bangunanDihapus.updateMany({ where: { desaId, kodeBangunan: -before }, data: { kodeBangunan: after } });
    }
    for (const [before, after] of Object.entries(LEGACY_REFRESHING_VALUES)) {
      await tx.penduduk.updateMany({ where: { desaId, refreshing: before }, data: { refreshing: after } });
    }

    for (const change of pending) {
      const data = remapPayload(change.data, mapping);
      const ringkasan = remapSummary(change.ringkasan, mapping);
      if (data.changed || ringkasan !== change.ringkasan) {
        await tx.stagingChange.update({ where: { id: change.id }, data: { data: data.value, ringkasan } });
      }
    }
  }, { isolationLevel: "Serializable", timeout: 60_000 });

  console.log(`${slug}: penomoran kode bangunan berhasil diperbarui.`);
}

async function main() {
  const options = readOptions(process.argv.slice(2));
  const slugs = options.allDemo ? DEFAULT_DEMO_SLUGS : [...new Set(options.slugs)];
  const villages = await prisma.desa.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  const found = new Set(villages.map((village) => village.slug));
  const missing = slugs.filter((slug) => !found.has(slug));
  if (missing.length) throw new Error(`Desa tidak ditemukan: ${missing.join(", ")}`);

  console.log(options.apply ? "Mode APPLY aktif." : "Mode DRY-RUN: tidak ada data yang diubah.");
  for (const village of villages.sort((left, right) => left.slug.localeCompare(right.slug))) {
    await resequenceDesa(village.id, village.slug, options.apply);
  }
  if (!options.apply) console.log("Dry-run selesai. Jalankan ulang dengan --apply --confirm-demo setelah backup diverifikasi.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
