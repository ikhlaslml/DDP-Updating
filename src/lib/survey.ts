import { ALL_COLUMNS, mapping } from "@/lib/indikator";

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

// Household-level answers are captured once from the head and inherited by
// member rows in the denormalized ajaib schema.
export const HOUSEHOLD_INHERITED_FIELDS = [
  "punya_kk",
  "nama_kepala_rumah",
  "nama_tulang_punggung",
  "jml_keluarga",
  "dead_jml",
  "akta_nikah",
  "akta_cerai",
  "pendidikan_anggota",
  "rp_pendidikan",
  "pekarangan",
  "pekarangan_luas",
  "pekarangan_air",
  "pekarangan_tinggi",
  "pekarangan_jenis",
  "pekarangan_komoditas",
  "sampah_buang",
  "sampah_pilah",
  "sampah_olah",
  "rumah_pln",
  "rp_listrik",
  "wifi",
  "airbersih",
  "airminum",
  "bahanbakar_masak",
  "rumah_solar",
  "par_organisasi",
  "organisasi_nama",
  "par_masyarakat",
  "par_pemilu",
  "par_kebijakan",
  "bansos",
  "rp_zakat",
  "wakaf",
  "rp_persepuluh",
  "rp_dharma",
  "rp_paramita",
  "rp_sumbangan",
  "hukum_bantuan",
  "hukum_jenis",
  "tanah_nama",
  "tanah_nomor",
  "nomor_objek_pajak",
  "tanah_bukti",
  "pbb_punya",
  "pbb_tahunbayar",
  "kesediaan",
  "media_informasi",
  "aset_ekonomi",
  "pinjaman",
  "kb",
  "kulkas",
  "sepeda_jml",
  "motor_jml",
  "motor_merk",
  "mobil_jml",
  "mobil_merk",
  "perahu_jml",
  "perahu_motor_jml",
  "kapal_jml",
  "motorlistrik_jml",
  "mobillistrik_jml",
  "kendaraan_jml",
  "rp_kendaraan",
  "elektronik_rumah",
  "rp_transportasi",
  "rp_cicilan",
  "lahan",
  "lahan_guna",
  "lahan_luasnon",
  "lahan_status",
  "lahan_luas_dikelola",
  "lahan_luas_tidakdikelola",
  "lahanmilik_irigasi",
  "lahanmilik_bukti",
  "lahanmilik_komoditas",
  "lahanmilik_lokasi",
  "lahangarap_luas",
  "lahangarap_irigasi",
  "lahangarap_komoditas",
  "lahangarap_lokasi",
  "lahansewa_luas",
  "lahansewa_irigasi",
  "lahansewa_komoditas",
  "lahansewa_lokasi",
  "baju_frek",
  "rp_sph",
  "makan_frek",
  "makan_menu",
  "tempat_belanja",
  "rp_belanja",
  "rp_pangan",
  "rp_non_pangan",
  ...ALL_COLUMNS.filter((name) => name.startsWith("kon_")),
  "rumah_lantai",
  "rumah_dinding",
  "rumah_atap",
  "rumah_jamban",
  "rumah_kamar",
  "rumah_milik",
  "rumah_tingkat",
  "rumah_luas",
  "ternak",
  "ternak_sapi",
  "ternak_kerbau",
  "ternak_domba",
  "ternak_kambing",
  "ternak_ayam",
  "ternak_itik",
  "ternak_kuda",
  "ternak_babi",
  "ternak_ikan",
] as string[];

const MEMBER_FIELDS = new Set([
  "nama",
  "nik",
  "status_dalam_keluarga",
  "status_kawin",
  "punya_ktp",
  "punya_aktalahir",
  "tgl_lahir",
  "jk",
  "menetap",
  "dinamika",
  "agama",
  "suku",
  "partisipasi_sekolah",
  "ijazah",
  "bantuan_pendidikan",
  "hp_punya",
  "hp_jumlah",
  "hp_merk",
  "hp_provider",
  "medsos",
  "korban_kejahatan",
  "disabilitas",
  "keterampilan",
  "pelatihan",
  "pelatihan_ket",
  "kerja_profesi",
  "kerja_status",
  "kerja_ket",
  "kerja_lokusaha",
  "kerja_sampingan",
  "kerja_sampingan_ket",
  "kerja_skalausaha",
  "bpjs_kes",
  "bpjs_tk",
  "asuransi_kes",
  "menabung",
  "rp_tabungan",
  "tki",
  "tki_tujuan",
  "penyakit_jumlah",
  "penyakit_jenis",
  "anak_asi",
  "anak_periksa",
  "anak_mpasi",
  "anak_tb",
  "anak_bb",
  "perokok",
  ...ALL_COLUMNS.filter((name) => name.startsWith("nel_")),
]);

export function surveyColumns(role: SurveyRole) {
  if (role === "MEMBER") return ALL_COLUMNS.filter((name) => MEMBER_FIELDS.has(name));
  return ALL_COLUMNS.filter((name) => !SYSTEM_FIELDS.has(name));
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
  record.responden = role === "HEAD" ? "Ya" : "Tidak";
  return record;
}

function isYes(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "ya" || normalized === "true";
}

export function isConditionalFieldVisible(name: string, values: Record<string, string>) {
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
