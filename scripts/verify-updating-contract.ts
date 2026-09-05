import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import metadataJson from "../config/updating-metadata.json";
import retiredJson from "../config/kolom-dipensiunkan.json";
import {
  DERIVED_HOUSEHOLD_FIELDS,
  HOUSEHOLD_INHERITED_FIELDS,
  MEMBER_FIELDS,
} from "../src/lib/survey";
import {
  LOCKED_IDENTITY_FIELDS,
  periodicColumns,
} from "../src/lib/updating-columns";

const stats = metadataJson._meta.stats;
assert.equal(stats.totalRows, 336);
assert.equal(stats.activeRows, 294);
assert.equal(stats.inactiveRows, 42);
assert.equal(stats.classifiedSchemaFields, 229);
assert.equal(stats.headFields, 224);
assert.equal(stats.memberFields, 66);
assert.equal(stats.headOnlyFields, 164);
assert.equal(stats.memberOnlyFields, 6);
assert.equal(stats.sharedFields, 60);
assert.equal(stats.sixMonthFields, 81);
assert.equal(stats.sixMonthHeadFields, 78);
assert.equal(stats.sixMonthMemberFields, 32);
assert.equal(stats.annualFields, 26);
assert.equal(stats.annualHeadFields, 26);
assert.equal(stats.annualMemberFields, 3);
assert.deepEqual(stats.skippedUnknownHeaders, ["alamat_ktp"]);
assert.equal(Object.hasOwn(metadataJson.fields, "alamat_ktp"), false);

assert.equal(retiredJson.columns.length, 40);
assert.equal(new Set(retiredJson.columns).size, 40);
for (const field of retiredJson.columns) {
  assert.equal(
    metadataJson.fields[field as keyof typeof metadataJson.fields]?.deprecated,
    true,
    `${field} must be retired`,
  );
}

assert.deepEqual(metadataJson.fields.partisipasi_sekolah.frequencyByRole, {
  HEAD: "INCIDENTAL",
  MEMBER: "SIX_MONTHS",
});
assert.deepEqual(metadataJson.fields.disabilitas.frequencyByRole, {
  HEAD: "INCIDENTAL",
  MEMBER: "SIX_MONTHS",
});
assert.deepEqual(metadataJson.fields.agama.frequencyByRole, {
  HEAD: "INCIDENTAL",
  MEMBER: "IMMUTABLE",
});

assert.equal(new Set(HOUSEHOLD_INHERITED_FIELDS).size, HOUSEHOLD_INHERITED_FIELDS.length);
assert.equal(
  HOUSEHOLD_INHERITED_FIELDS.filter((field) => MEMBER_FIELDS.has(field)).length,
  0,
);
for (const field of DERIVED_HOUSEHOLD_FIELDS) {
  assert.equal(HOUSEHOLD_INHERITED_FIELDS.includes(field), true);
}

for (const cycle of ["SIX_MONTHS", "ANNUAL"] as const) {
  const columns = periodicColumns(cycle);
  const all = [...columns.family, ...columns.head, ...columns.member];
  for (const field of LOCKED_IDENTITY_FIELDS) {
    assert.equal(all.includes(field), false, `${field} must be locked for ${cycle}`);
  }
  assert.equal(all.includes("kode_deskel"), false);
  assert.equal(all.includes("deskel"), false);
}

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "prisma",
    "migrations",
    "20260905150000_family_periodic_updates",
    "migration.sql",
  ),
  "utf8",
);
assert.equal(/\bDROP\s+(TABLE|COLUMN)\b/i.test(migration), false);

console.log(
  JSON.stringify(
    {
      stats,
      retiredColumns: retiredJson.columns.length,
      householdInheritedFields: HOUSEHOLD_INHERITED_FIELDS.length,
      memberOperationalFields: MEMBER_FIELDS.size,
      sixMonthColumns: periodicColumns("SIX_MONTHS"),
      annualColumns: periodicColumns("ANNUAL"),
      migration: "additive",
    },
    null,
    2,
  ),
);
