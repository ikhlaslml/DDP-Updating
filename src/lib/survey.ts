import { ALL_COLUMNS, isOperationalColumn, mapping } from "@/lib/indikator";
import {
  parameterAskedTo,
  parameterCondition,
  parameterIsConditionOnly,
  parameterIsEditable,
  type ParameterRole,
} from "@/lib/parameter-metadata";

export type SurveyRole = "HEAD" | "MEMBER";

export const SYSTEM_FIELDS = new Set([
  "abs_id",
  "subjek",
  "datamasuk",
  "enumerator",
  "kode_bangunan",
  "kode_deskel",
  "deskel",
  "dusun",
  "rw",
  "rt",
  "lat",
  "lng",
  "alamat",
  "responden",
  "kesediaan",
  "nama_kepala_rumah",
  "jml_keluarga",
  "usia",
  "usia_dec",
  "lama_tinggal",
]);

export const LOCATION_INHERITED_FIELDS = [
  "nkk",
  "kode_bangunan",
  "kode_deskel",
  "deskel",
  "dusun",
  "rw",
  "rt",
  "lat",
  "lng",
  "alamat",
] as const;

// Values calculated outside the questionnaire remain inherited so a newly
// added member does not diverge from the rest of the denormalized household.
export const DERIVED_HOUSEHOLD_FIELDS = [
  "miskin_bps",
  "miskin_ekstrem",
  "miskin_uufm",
  "miskin_wb",
  "miskin_bpsd",
  "skor_kls",
  "ppkb",
  "ppkt",
  "pkb",
] as const;

// The reviewed CSV is authoritative: fields asked only to the head represent
// one household answer and are inherited by new members.
export const HOUSEHOLD_INHERITED_FIELDS = [
  ...new Set([
    ...ALL_COLUMNS.filter((name) => {
      const askedTo = parameterAskedTo(name);
      return askedTo.length === 1 && askedTo[0] === "HEAD" && isOperationalColumn(name);
    }),
    ...DERIVED_HOUSEHOLD_FIELDS,
  ]),
] as string[];

export const MEMBER_FIELDS = new Set(
  ALL_COLUMNS.filter(
    (name) =>
      (parameterAskedTo(name).includes("MEMBER") || parameterIsConditionOnly(name)) &&
      isOperationalColumn(name),
  ),
);

export function isHouseholdField(name: string) {
  return HOUSEHOLD_INHERITED_FIELDS.includes(name);
}

export function surveyColumns(role: SurveyRole) {
  if (role === "MEMBER") {
    return ALL_COLUMNS.filter(
      (name) => MEMBER_FIELDS.has(name) && isOperationalColumn(name) && parameterIsEditable(name, role),
    );
  }
  return ALL_COLUMNS.filter(
    (name) => !SYSTEM_FIELDS.has(name) && isOperationalColumn(name) && parameterIsEditable(name, role),
  );
}

export function surveyColumnsByGroup(role: SurveyRole) {
  const allowed = new Set(surveyColumns(role));
  return Object.entries(mapping.kolom).reduce<Record<string, string[]>>((groups, [name, def]) => {
    if (!allowed.has(name)) return groups;
    (groups[def.kelompok] ??= []).push(name);
    return groups;
  }, {});
}

export function blankSurveyRecord(role: SurveyRole): Record<string, string> {
  const record: Record<string, string> = {};
  for (const name of surveyColumns(role)) record[name] = "";
  record.subjek = role === "HEAD" ? "Keluarga" : "Individu";
  record.status_dalam_keluarga = role === "HEAD" ? "Kepala Keluarga" : "";
  return record;
}

function isYes(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "ya" || normalized === "true";
}

export function isConditionalFieldVisible(name: string, values: Record<string, string>, role?: ParameterRole) {
  const condition = parameterCondition(name, role);
  if (condition) {
    const current = (values[condition.field] ?? "").toLocaleLowerCase("id-ID");
    const selected = current.split(";").map((value) => value.trim()).filter(Boolean);
    const expected = condition.values.map((value) => String(value).toLocaleLowerCase("id-ID"));
    if (!expected.some((value) => selected.includes(value) || current === value)) return false;
  }
  if (name === "bantuan_pendidikan") return values.partisipasi_sekolah === "Masih Bersekolah";
  if (name === "pelatihan_ket") return isYes(values.pelatihan);
  if (name === "tki_tujuan") return isYes(values.tki);
  if (name === "pbb_tahunbayar") return isYes(values.pbb_punya);
  if (["hp_jumlah", "hp_merk", "hp_provider", "medsos"].includes(name)) return isYes(values.hp_punya);
  if (name === "organisasi_nama") return isYes(values.par_organisasi);
  if (name === "rp_tabungan") return isYes(values.menabung);
  if (name === "penyakit_jenis") return Number(values.penyakit_jumlah) > 0;
  if (name === "hukum_jenis") return Boolean(values.hukum_bantuan && values.hukum_bantuan !== "Tidak");
  if (name.startsWith("pekarangan_") && name !== "pekarangan") return isYes(values.pekarangan);
  if (name.startsWith("lahan") && name !== "lahan") return isYes(values.lahan);
  if (name.startsWith("ternak_") && name !== "ternak") return isYes(values.ternak);
  if (name === "motor_merk") return Number(values.motor_jml) > 0;
  if (name === "mobil_merk") return Number(values.mobil_jml) > 0;
  if (name === "akta_nikah" || name === "tgl_kawin") return values.status_kawin === "Kawin";
  if (name === "akta_cerai") return values.status_kawin === "Cerai Hidup";
  if (name === "rp_zakat" || name === "wakaf") return values.agama === "Islam";
  if (name === "rp_persepuluh") return values.agama === "Kristen" || values.agama === "Katolik";
  if (name === "rp_dharma") return values.agama === "Hindu";
  if (name === "rp_paramita") return values.agama === "Buddha";
  if (name.startsWith("anak_")) {
    const birth = values.tgl_lahir ? new Date(values.tgl_lahir) : null;
    if (!birth || Number.isNaN(birth.getTime())) return false;
    const age = (Date.now() - birth.getTime()) / (365.2425 * 24 * 60 * 60 * 1000);
    return age >= 0 && age <= 5;
  }
  if (name.startsWith("nel_")) {
    const profession = values.kerja_profesi?.toLowerCase() ?? "";
    if (!profession.includes("nelayan") && !profession.includes("perikanan")) return false;
    if (["nel_kategori", "nel_jenis", "nel_pernah"].includes(name)) return true;
    const branch = `${values.nel_kategori ?? ""} ${values.nel_jenis ?? ""}`.toLowerCase();
    const cultivationField = /budidaya|biota|rumputlaut|sumber_air|bibit|produksi|hasil_jual|rucah|pakan/.test(name);
    const captureField = /tangkap|penangkapan|kapal|ikan_kecil|alat_bantu|kepemilikan|waktu/.test(name);
    if (cultivationField) return branch.includes("budidaya");
    if (captureField) return branch.includes("tangkap");
    return true;
  }
  return true;
}
