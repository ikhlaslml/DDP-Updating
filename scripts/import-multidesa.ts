import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { Prisma, PrismaClient } from "@prisma/client";
import { ALL_COLUMNS, mapping } from "../src/lib/indikator";
import { fromImportValue } from "../src/lib/export-import";
import { flattenZodError, pendudukCreateSchema, REQUIRED_FIELDS } from "../src/lib/validation";
import { formatVillageCode, normalizeVillageCode, normalizeVillageName } from "../src/lib/village-identity";

type Village = { id: string; nama: string; kodeWilayah: string | null };
type PreparedRow = { rowNumber: number; village: Village; data: Prisma.PendudukCreateManyInput };
type SafeRowError = { row: number; fields: Record<string, string> };

const MAX_FILE_BYTES = 200 * 1024 * 1024;
const MAX_ROWS = 250_000;
const MAX_REPORTED_ERRORS = 200;
const INSERT_BATCH = 20;
const SNAPSHOT_BATCH = 100;

function argument(name: string) {
  const exact = process.argv.indexOf(`--${name}`);
  if (exact >= 0) return process.argv[exact + 1];
  const prefixed = process.argv.find((value) => value.startsWith(`--${name}=`));
  return prefixed?.slice(name.length + 3);
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

function dataCollectionYear(value: string | undefined) {
  if (value === undefined) return undefined;
  if (!/^\d{4}$/.test(value)) throw new Error("--tahun-pendataan harus berupa tahun empat digit, misalnya 2024");
  const year = Number(value);
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear + 1) {
    throw new Error(`--tahun-pendataan harus berada antara 1900 dan ${currentYear + 1}`);
  }
  return year;
}

function chunks<T>(values: T[], size: number) {
  const output: T[][] = [];
  for (let index = 0; index < values.length; index += size) output.push(values.slice(index, index + size));
  return output;
}

function safeMessage(message: string) {
  return message.replace(/"[^"]*"/g, '"[nilai disamarkan]"').slice(0, 240);
}

function deterministicAbsId(kodeWilayah: string | null, nik: string) {
  const digest = createHash("sha256").update(`${normalizeVillageCode(kodeWilayah)}:${nik}`).digest("hex").slice(0, 20);
  return `ABS-IMPORT-${digest}`;
}

function resolveVillage(row: Record<string, string>, villages: Village[]) {
  const code = normalizeVillageCode(row.kode_deskel);
  const name = normalizeVillageName(row.deskel);
  const byCode = code ? villages.filter((village) => normalizeVillageCode(village.kodeWilayah) === code) : [];
  const byName = name ? villages.filter((village) => normalizeVillageName(village.nama) === name) : [];

  if (byCode.length > 1) return { error: "kode_deskel dipakai oleh lebih dari satu tenant pada database" } as const;
  if (byName.length > 1) return { error: "nama deskel tidak unik pada database" } as const;
  if (byCode[0] && byName[0] && byCode[0].id !== byName[0].id) {
    return { error: "kode_deskel dan deskel menunjuk tenant yang berbeda" } as const;
  }
  const village = byCode[0] ?? byName[0];
  if (!village) return { error: "kode_deskel/deskel belum terdaftar pada tabel Desa" } as const;
  return { village, nameWarning: Boolean(byCode[0] && name && !byName[0]) } as const;
}

async function main() {
  const fileArgument = argument("file");
  const expectedVillageCount = Number(argument("expected-villages") ?? "4");
  const tahunPendataan = dataCollectionYear(argument("tahun-pendataan"));
  const apply = hasFlag("apply");
  if (!fileArgument) throw new Error('Gunakan --file "C:\\lokasi\\data-empat-desa.csv"');
  if (!Number.isInteger(expectedVillageCount) || expectedVillageCount < 1 || expectedVillageCount > 50) {
    throw new Error("--expected-villages harus berupa angka 1 sampai 50");
  }

  const filePath = path.resolve(fileArgument);
  if (!fs.existsSync(filePath)) throw new Error("CSV tidak ditemukan pada lokasi yang diberikan");
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size === 0) throw new Error("CSV tidak ditemukan atau kosong");
  if (stat.size > MAX_FILE_BYTES) throw new Error("CSV melebihi batas aman 200 MB");
  if (path.extname(filePath).toLocaleLowerCase("en-US") !== ".csv") throw new Error("Alat ini hanya menerima CSV");

  const fileBytes = fs.readFileSync(filePath);
  const checksum = createHash("sha256").update(fileBytes).digest("hex").toLocaleUpperCase("en-US");
  const parsed = Papa.parse<Record<string, string>>(fileBytes.toString("utf8").replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });
  if (parsed.errors.length) throw new Error(`CSV tidak valid; parser menemukan ${parsed.errors.length} kesalahan`);
  if (parsed.data.length > MAX_ROWS) throw new Error(`CSV melebihi batas ${MAX_ROWS.toLocaleString("id-ID")} baris`);

  const headers = parsed.meta.fields ?? [];
  const missing = [...REQUIRED_FIELDS].filter((field) => !headers.includes(field));
  if (!headers.includes("kode_deskel") && !headers.includes("deskel")) missing.push("kode_deskel atau deskel");
  if (missing.length) throw new Error(`Header wajib belum ada: ${missing.join(", ")}`);
  const unknownColumns = headers.filter((header) => header && !ALL_COLUMNS.includes(header));
  const knownColumns = headers.filter((header) => ALL_COLUMNS.includes(header));

  const directUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!directUrl) throw new Error("DATABASE_URL_UNPOOLED atau DATABASE_URL belum dikonfigurasi");
  const prisma = new PrismaClient({ datasourceUrl: directUrl });

  try {
    const villages = await prisma.desa.findMany({
      select: { id: true, nama: true, kodeWilayah: true },
      orderBy: { nama: "asc" },
    });
    const prepared: PreparedRow[] = [];
    const errors: SafeRowError[] = [];
    let errorCount = 0;
    let nameWarningCount = 0;
    const seenNiks = new Set<string>();
    const seenAbsIds = new Set<string>();

    const addError = (row: number, fields: Record<string, string>) => {
      errorCount += 1;
      if (errors.length < MAX_REPORTED_ERRORS) errors.push({ row, fields });
    };

    for (let index = 0; index < parsed.data.length; index += 1) {
      const source = parsed.data[index];
      const rowNumber = index + 2;
      const resolved = resolveVillage(source, villages);
      if ("error" in resolved && resolved.error) {
        addError(rowNumber, { kode_deskel: resolved.error });
        continue;
      }
      if (resolved.nameWarning) nameWarningCount += 1;

      const record: Record<string, unknown> = {};
      const parseErrors: Record<string, string> = {};
      for (const column of knownColumns) {
        const result = fromImportValue(source[column] ?? "", mapping.kolom[column]);
        if (!result.ok) parseErrors[column] = safeMessage(result.message);
        else if (result.value !== undefined) record[column] = result.value;
      }
      if (Object.keys(parseErrors).length) {
        addError(rowNumber, parseErrors);
        continue;
      }

      record.kode_deskel = resolved.village.kodeWilayah
        ? formatVillageCode(resolved.village.kodeWilayah)
        : String(record.kode_deskel ?? "").trim();
      record.deskel = resolved.village.nama;
      const validated = pendudukCreateSchema.safeParse(record);
      if (!validated.success) {
        const fields = Object.fromEntries(
          Object.entries(flattenZodError(validated.error)).map(([key, value]) => [key, safeMessage(value)])
        );
        addError(rowNumber, fields);
        continue;
      }

      const nik = String(validated.data.nik);
      const absId = String(validated.data.abs_id || deterministicAbsId(resolved.village.kodeWilayah, nik));
      if (seenNiks.has(nik)) {
        addError(rowNumber, { nik: "NIK duplikat di dalam CSV" });
        continue;
      }
      if (seenAbsIds.has(absId)) {
        addError(rowNumber, { abs_id: "ID absolut duplikat di dalam CSV" });
        continue;
      }
      seenNiks.add(nik);
      seenAbsIds.add(absId);
      prepared.push({
        rowNumber,
        village: resolved.village,
        data: { ...(validated.data as Prisma.PendudukCreateManyInput), abs_id: absId, desaId: resolved.village.id },
      });
    }

    const targetVillages = [...new Map(prepared.map((row) => [row.village.id, row.village])).values()]
      .sort((left, right) => left.nama.localeCompare(right.nama, "id-ID"));
    if (targetVillages.length !== expectedVillageCount) {
      throw new Error(`CSV valid mengarah ke ${targetVillages.length} desa; seharusnya ${expectedVillageCount}`);
    }

    const existingByVillage = await Promise.all(targetVillages.map(async (village) => ({
      village,
      residents: await prisma.penduduk.count({ where: { desaId: village.id } }),
      snapshots: await prisma.snapshot.count({ where: { desaId: village.id } }),
    })));
    const nonEmptyTargets = existingByVillage.filter((item) => item.residents > 0 || item.snapshots > 0);

    const existingNiks = new Set<string>();
    const existingAbsIds = new Set<string>();
    for (const batch of chunks([...seenNiks], 1_000)) {
      const rows = await prisma.penduduk.findMany({ where: { nik: { in: batch } }, select: { nik: true } });
      rows.forEach((row) => { if (row.nik) existingNiks.add(row.nik); });
    }
    for (const batch of chunks([...seenAbsIds], 1_000)) {
      const rows = await prisma.penduduk.findMany({ where: { abs_id: { in: batch } }, select: { abs_id: true } });
      rows.forEach((row) => { if (row.abs_id) existingAbsIds.add(row.abs_id); });
    }
    for (const row of prepared) {
      const fields: Record<string, string> = {};
      if (existingNiks.has(String(row.data.nik))) fields.nik = "NIK sudah ada pada database";
      if (existingAbsIds.has(String(row.data.abs_id))) fields.abs_id = "ID absolut sudah ada pada database";
      if (Object.keys(fields).length) addError(row.rowNumber, fields);
    }

    const counts = new Map<string, number>();
    for (const row of prepared) counts.set(row.village.id, (counts.get(row.village.id) ?? 0) + 1);
    console.log("\nRingkasan dry-run impor baseline empat desa");
    console.log(`SHA-256 CSV       : ${checksum}`);
    console.log(`Jumlah baris      : ${parsed.data.length.toLocaleString("id-ID")}`);
    console.log(`Baris lolos       : ${prepared.length.toLocaleString("id-ID")}`);
    console.log(`Baris bermasalah  : ${errorCount.toLocaleString("id-ID")}`);
    console.log(`Kolom tidak dikenal: ${unknownColumns.length}`);
    console.log(`Peringatan beda nama (kode tetap cocok): ${nameWarningCount}`);
    if (tahunPendataan) console.log(`Tahun pendataan  : ${tahunPendataan}`);
    console.log("\nPembagian tenant:");
    for (const village of targetVillages) {
      console.log(`- ${village.nama} (${formatVillageCode(village.kodeWilayah)}): ${(counts.get(village.id) ?? 0).toLocaleString("id-ID")} baris`);
    }
    if (nonEmptyTargets.length) {
      console.log("\nTarget belum kosong (apply diblokir):");
      for (const item of nonEmptyTargets) console.log(`- ${item.village.nama}: ${item.residents} penduduk, ${item.snapshots} snapshot`);
    }
    if (errors.length) {
      console.log(`\nContoh kesalahan aman (maksimal ${MAX_REPORTED_ERRORS}, tanpa nilai PII):`);
      for (const error of errors) {
        console.log(`- Baris ${error.row}: ${Object.entries(error.fields).map(([field, message]) => `${field}: ${message}`).join("; ")}`);
      }
    }

    if (!apply) {
      console.log("\nDRY-RUN selesai. Tidak ada data yang ditulis. Tambahkan --apply hanya pada database UAT kosong setelah backup.");
      return;
    }
    if (errorCount) throw new Error(`Apply dibatalkan karena terdapat ${errorCount} baris bermasalah`);
    if (nonEmptyTargets.length) throw new Error("Apply dibatalkan karena satu atau lebih tenant target belum kosong");

    await prisma.$transaction(async (tx) => {
      for (const village of targetVillages) {
        const villageRows = prepared.filter((row) => row.village.id === village.id).map((row) => row.data);
        for (const batch of chunks(villageRows, INSERT_BATCH)) await tx.penduduk.createMany({ data: batch });

        if (tahunPendataan) {
          await tx.desa.update({ where: { id: village.id }, data: { tahunPendataan } });
        }

        const inserted = await tx.penduduk.findMany({ where: { desaId: village.id }, orderBy: { id: "asc" } });
        const buildingCount = new Set(inserted.flatMap((row) => row.kode_bangunan === null ? [] : [row.kode_bangunan])).size;
        const snapshot = await tx.snapshot.create({
          data: {
            desaId: village.id,
            kode: "T0",
            urutan: 0,
            label: tahunPendataan ? `Data Dasar ${tahunPendataan}` : "Baseline Awal Impor Empat Desa",
            catatan: `Impor aman CSV SHA-256 ${checksum}`,
            jumlah: inserted.length,
            jumlahBangunan: buildingCount,
            changeCount: inserted.length,
            changeSummary: "Baseline awal dari CSV gabungan yang dipisahkan berdasarkan kode desa",
            createdBy: "secure-multidesa-import",
            createdByName: "Alat Impor Aman DDP",
          },
        });
        const snapshotRows = inserted.map((row) => ({
          snapshotId: snapshot.id,
          nik: row.nik,
          nkk: row.nkk,
          nama: row.nama,
          dusun: row.dusun,
          data: JSON.stringify(row),
        }));
        for (const batch of chunks(snapshotRows, SNAPSHOT_BATCH)) await tx.snapshotPenduduk.createMany({ data: batch });
      }
    }, { maxWait: 30_000, timeout: 900_000 });

    console.log("\nAPPLY berhasil. Empat tenant dan snapshot T0 telah dibuat secara atomik.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`\nImpor dibatalkan: ${error instanceof Error ? error.message : "kesalahan tidak diketahui"}`);
  process.exitCode = 1;
});
