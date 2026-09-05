import { ALL_COLUMNS } from "@/lib/indikator";
import {
  parameterAskedTo,
  parameterFrequency,
  parameterIsConditionOnly,
  parameterIsDeprecated,
  parameterIsEditable,
  type ParameterRole,
} from "@/lib/parameter-metadata";
import { isHouseholdField } from "@/lib/survey";

export type PeriodicCycle = "SIX_MONTHS" | "ANNUAL";
export type UpdateScope = "FAMILY" | "PERSON";

export const LOCKED_IDENTITY_FIELDS = [
  "nkk",
  "nik",
  "nama",
  "dusun",
  "rt",
  "rw",
  "kode_bangunan",
] as const;
export const EXCLUDED_PERIODIC_FIELDS = ["kode_deskel", "deskel"] as const;

const locked = new Set<string>(LOCKED_IDENTITY_FIELDS);
const excluded = new Set<string>(EXCLUDED_PERIODIC_FIELDS);

export function isPeriodicIndicator(field: string, role: ParameterRole, cycle: PeriodicCycle) {
  return (
    !locked.has(field) &&
    !excluded.has(field) &&
    !parameterIsDeprecated(field) &&
    !parameterIsConditionOnly(field) &&
    parameterAskedTo(field).includes(role as "HEAD" | "MEMBER") &&
    parameterFrequency(field, role) === cycle
  );
}

export function familyPeriodicFields(cycle: PeriodicCycle) {
  return ALL_COLUMNS.filter(
    (field) => isHouseholdField(field) && isPeriodicIndicator(field, "HEAD", cycle),
  );
}

export function personPeriodicFields(role: "HEAD" | "MEMBER", cycle: PeriodicCycle) {
  return ALL_COLUMNS.filter(
    (field) => !isHouseholdField(field) && isPeriodicIndicator(field, role, cycle),
  );
}

export function periodicColumns(cycle: PeriodicCycle) {
  return {
    family: familyPeriodicFields(cycle),
    head: personPeriodicFields("HEAD", cycle),
    member: personPeriodicFields("MEMBER", cycle),
  };
}

export function updateScopeForField(field: string): UpdateScope {
  return isHouseholdField(field) ? "FAMILY" : "PERSON";
}

export function cycleFromSlug(value: string | null | undefined): PeriodicCycle {
  return value === "1-tahun" || value === "ANNUAL" ? "ANNUAL" : "SIX_MONTHS";
}

export function cycleSlug(cycle: PeriodicCycle) {
  return cycle === "ANNUAL" ? "1-tahun" : "6-bulan";
}

export function cycleLabel(cycle: PeriodicCycle) {
  return cycle === "ANNUAL" ? "1 Tahun" : "6 Bulan";
}

const TECHNICAL_INLINE_BLOCK = new Set<string>([
  ...LOCKED_IDENTITY_FIELDS,
  ...EXCLUDED_PERIODIC_FIELDS,
  "abs_id",
  "subjek",
  "datamasuk",
  "enumerator",
  "usia",
  "usia_dec",
  "lama_tinggal",
  "lat",
  "lng",
  "jml_keluarga",
  "nama_kepala_rumah",
  "responden",
]);

export function isInlineEditableField(field: string, role: ParameterRole) {
  return (
    !TECHNICAL_INLINE_BLOCK.has(field) &&
    !parameterIsDeprecated(field) &&
    !parameterIsConditionOnly(field) &&
    parameterIsEditable(field, role)
  );
}
