import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_SOURCE = path.join(ROOT, "config", "sources", "merge_pertanyaan.csv");
const MAPPING_PATH = path.join(ROOT, "config", "indikator-mapping.json");
const METADATA_PATH = path.join(ROOT, "config", "updating-metadata.json");
const RETIRED_PATH = path.join(ROOT, "config", "kolom-dipensiunkan.json");

const FREQUENCIES = {
  Insidentil: "INCIDENTAL",
  "6 bulan": "SIX_MONTHS",
  Tahunan: "ANNUAL",
  "Tidak Berubah": "IMMUTABLE",
};
const ROLES = {
  "kepala keluarga": "HEAD",
  "anggota keluarga": "MEMBER",
};
const PRIORITY = { IMMUTABLE: 0, INCIDENTAL: 1, ANNUAL: 2, SIX_MONTHS: 3 };
const CONDITION_ONLY = new Set(["nel_kategori", "penyakit_jumlah"]);
const DERIVED = new Set([
  "miskin_bps",
  "miskin_ekstrem",
  "miskin_uufm",
  "miskin_wb",
  "miskin_bpsd",
  "skor_kls",
  "ppkb",
  "ppkt",
  "pkb",
]);

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Required source is missing: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function parseDelimited(content) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (char === '"') {
      if (quoted && content[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ";" && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && content[index + 1] === "\n") index += 1;
      row.push(value);
      value = "";
      if (row.some((cell) => cell.length)) rows.push(row);
      row = [];
    } else {
      value += char;
    }
  }
  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }
  const headers = rows.shift()?.map((cell) => cell.replace(/^\uFEFF/, "")) ?? [];
  return rows.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])),
  );
}

function chooseFrequency(byRole) {
  const values = Object.values(byRole);
  return values.length
    ? values.reduce((best, current) => (PRIORITY[current] > PRIORITY[best] ? current : best))
    : null;
}

function main() {
  const args = process.argv.slice(2);
  const importIndex = args.indexOf("--import-source");
  const shouldImport = importIndex >= 0;
  if (shouldImport) args.splice(importIndex, 1);
  let source = path.resolve(args[0] ?? DEFAULT_SOURCE);
  if (fs.existsSync(source) && fs.statSync(source).isDirectory()) {
    source = path.join(source, "merge_pertanyaan.csv");
  }
  if (!fs.existsSync(source)) {
    throw new Error(
      `Question source is missing: ${source}. Pass the CSV path and --import-source on the first run.`,
    );
  }
  if (shouldImport) {
    fs.mkdirSync(path.dirname(DEFAULT_SOURCE), { recursive: true });
    if (source !== path.resolve(DEFAULT_SOURCE)) fs.copyFileSync(source, DEFAULT_SOURCE);
    source = DEFAULT_SOURCE;
  }

  const mapping = readJson(MAPPING_PATH).kolom;
  const previous = readJson(METADATA_PATH);
  const retired = new Set(readJson(RETIRED_PATH).columns);
  const rows = parseDelimited(fs.readFileSync(source, "utf8"));

  const byFieldRole = new Map();
  const labels = new Map();
  const skippedUnknown = new Set();
  const statusCounts = new Map();
  const rawRoleFields = { HEAD: new Set(), MEMBER: new Set() };

  for (const row of rows) {
    const status = (row.status ?? "").trim();
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
    if (status !== "0") continue;
    const field = (row.header ?? "").trim();
    const role = ROLES[(row.subjek ?? "").trim().toLocaleLowerCase("id-ID")];
    const frequency = FREQUENCIES[(row["periode updating"] ?? "").trim()];
    if (!field || !role || !frequency) continue;
    rawRoleFields[role].add(field);
    if (!(field in mapping)) {
      skippedUnknown.add(field);
      continue;
    }
    const byRole = byFieldRole.get(field) ?? {};
    if (byRole[role] && byRole[role] !== frequency) {
      throw new Error(`Conflicting frequency for ${field}/${role}: ${byRole[role]} vs ${frequency}`);
    }
    byRole[role] = frequency;
    byFieldRole.set(field, byRole);
    if (!labels.has(field)) labels.set(field, (row.value ?? "").trim());
  }

  const fields = {};
  for (const field of Object.keys(mapping)) {
    const old = { ...(previous.fields?.[field] ?? {}) };
    const frequencyByRole = byFieldRole.get(field) ?? {};
    const askedTo = ["HEAD", "MEMBER"].filter((role) => role in frequencyByRole);
    const conditionOnly = CONDITION_ONLY.has(field);
    const deprecated = retired.has(field);
    const variants = { ...(old.variants ?? {}) };
    if (conditionOnly) {
      for (const role of ["HEAD", "MEMBER"]) {
        variants[role] = { ...(variants[role] ?? {}), active: true };
      }
    }
    fields[field] = {
      ...old,
      frequency: chooseFrequency(frequencyByRole),
      frequencyByRole,
      askedTo,
      frequencySource: labels.get(field) ?? null,
      frequencyConfidence: Object.keys(frequencyByRole).length ? 1 : 0,
      editable:
        !deprecated &&
        (conditionOnly || Object.values(variants).some((variant) => Boolean(variant?.active))),
      deprecated,
      conditionOnly,
      derived: DERIVED.has(field),
      variants,
    };
  }

  const head = new Set([...byFieldRole].filter(([, roles]) => "HEAD" in roles).map(([field]) => field));
  const member = new Set([...byFieldRole].filter(([, roles]) => "MEMBER" in roles).map(([field]) => field));
  const periodicByRole = (frequency, role) =>
    new Set(
      [...byFieldRole]
        .filter(([, roles]) => roles[role] === frequency)
        .map(([field]) => field),
    );
  const periodic = (frequency) =>
    new Set(
      [...byFieldRole]
        .filter(([, roles]) => Object.values(roles).includes(frequency))
        .map(([field]) => field),
    );
  const stats = {
    totalRows: rows.length,
    activeRows: statusCounts.get("0") ?? 0,
    inactiveRows: statusCounts.get("1") ?? 0,
    classifiedSchemaFields: byFieldRole.size,
    headFields: rawRoleFields.HEAD.size,
    memberFields: rawRoleFields.MEMBER.size,
    headOnlyFields: [...rawRoleFields.HEAD].filter((field) => !rawRoleFields.MEMBER.has(field)).length,
    memberOnlyFields: [...rawRoleFields.MEMBER].filter((field) => !rawRoleFields.HEAD.has(field)).length,
    sharedFields: [...rawRoleFields.HEAD].filter((field) => rawRoleFields.MEMBER.has(field)).length,
    classifiedHeadFields: head.size,
    classifiedMemberFields: member.size,
    classifiedHeadOnlyFields: [...head].filter((field) => !member.has(field)).length,
    sixMonthFields: periodic("SIX_MONTHS").size,
    sixMonthHeadFields: periodicByRole("SIX_MONTHS", "HEAD").size,
    sixMonthMemberFields: periodicByRole("SIX_MONTHS", "MEMBER").size,
    annualFields: periodic("ANNUAL").size,
    annualHeadFields: periodicByRole("ANNUAL", "HEAD").size,
    annualMemberFields: periodicByRole("ANNUAL", "MEMBER").size,
    skippedUnknownHeaders: [...skippedUnknown].sort(),
  };
  const expected = {
    totalRows: 336,
    activeRows: 294,
    inactiveRows: 42,
    classifiedSchemaFields: 229,
    headFields: 224,
    memberFields: 66,
    headOnlyFields: 164,
    memberOnlyFields: 6,
    sharedFields: 60,
    classifiedHeadFields: 223,
    classifiedMemberFields: 66,
    classifiedHeadOnlyFields: 163,
    sixMonthFields: 81,
    sixMonthHeadFields: 78,
    sixMonthMemberFields: 32,
    annualFields: 26,
    annualHeadFields: 26,
    annualMemberFields: 3,
    skippedUnknownHeaders: ["alamat_ktp"],
  };
  if (JSON.stringify(stats) !== JSON.stringify(expected)) {
    console.error(JSON.stringify(stats, null, 2));
    throw new Error("Generated metadata stats differ from the reviewed CSV baseline.");
  }

  const output = {
    _meta: {
      sources: ["config/sources/merge_pertanyaan.csv"],
      tooltipPolicy: previous._meta?.tooltipPolicy ?? "QUESTION_LOGIC_ONLY",
      unmappedFrequency: Object.keys(mapping).filter((field) => !fields[field].frequency),
      stats,
    },
    fields,
    events: previous.events ?? {},
    building: previous.building ?? {},
  };
  fs.writeFileSync(METADATA_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(stats, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
