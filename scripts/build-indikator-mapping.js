// Generates config/indikator-mapping.json from scripts/columns-raw.txt.
// Group assignment is explicit and reviewable here; group1-3 are hand-verified
// against the target counts in the prompt (41 / 9 / 16). Groups 4-6 are
// assigned by theme and the resulting counts vs targets (50 / 72 / 71) are
// printed at the end instead of being forced to match exactly.
const fs = require("fs");
const path = require("path");

const raw = fs.readFileSync(path.join(__dirname, "columns-raw.txt"), "utf8").trim();
const allCols = raw.split(",").map((s) => s.trim());

const GROUPS = {
  identitas_keluarga: "Identitas Keluarga",
  pendidikan_kebudayaan: "Pendidikan dan Kebudayaan",
  infrastruktur_lingkungan: "Infrastruktur dan Lingkungan Hidup",
  sosial_hukum_ham: "Kehidupan Sosial, Perlindungan Hukum dan HAM",
  kesehatan_kerja_jamsos: "Kesehatan, Pekerjaan, dan Jaminan Sosial",
  sandang_pangan_papan: "Sandang, Pangan, dan Papan",
};

const TARGET_COUNTS = {
  identitas_keluarga: 41,
  pendidikan_kebudayaan: 9,
  infrastruktur_lingkungan: 16,
  sosial_hukum_ham: 50,
  kesehatan_kerja_jamsos: 72,
  sandang_pangan_papan: 71,
};

// --- explicit group membership -------------------------------------------------
const group1 = [
  "abs_id", "subjek", "datamasuk", "enumerator", "kode_bangunan", "kode_deskel",
  "deskel", "dusun", "rw", "rt", "lat", "lng", "responden", "nkk", "nama", "nik",
  "alamat", "status_dalam_keluarga", "status_kawin", "punya_ktp", "punya_aktalahir",
  "nama_kepala_rumah", "nama_tulang_punggung", "no_hp", "jml_keluarga", "tgl_lahir",
  "jk", "thn_datang", "dinamika", "agama", "suku", "bhs_keluarga", "bhs_daerah",
  "tgl_kawin", "usia", "lama_tinggal", "punya_kk", "menetap", "dead_jml",
  "akta_nikah", "akta_cerai",
];

const group2 = [
  "partisipasi_sekolah", "ijazah", "rp_pendidikan", "bantuan_pendidikan",
  "pendidikan_anggota", "keterampilan", "pelatihan", "pelatihan_ket", "refreshing",
];

const group3 = [
  "pekarangan", "pekarangan_luas", "pekarangan_air", "pekarangan_tinggi",
  "pekarangan_jenis", "pekarangan_komoditas", "sampah_buang", "sampah_pilah",
  "sampah_olah", "rumah_pln", "rp_listrik", "wifi", "airbersih", "airminum",
  "bahanbakar_masak", "rumah_solar",
];

const group4 = [
  "par_organisasi", "organisasi_nama", "par_masyarakat", "par_pemilu",
  "par_kebijakan", "bansos", "rp_zakat", "wakaf", "rp_persepuluh", "rp_dharma",
  "rp_paramita", "rp_sumbangan", "disabilitas", "korban_kejahatan",
  "hukum_bantuan", "hukum_jenis", "tanah_nama", "tanah_nomor",
  "nomor_objek_pajak", "tanah_bukti", "pbb_punya", "pbb_tahunbayar",
  "kesediaan", "medsos", "media_informasi", "kandung", "aset_ekonomi",
  "pinjaman", "kb", "kulkas", "sepeda_jml", "motor_jml", "motor_merk",
  "mobil_jml", "mobil_merk", "perahu_jml", "perahu_motor_jml", "kapal_jml",
  "motorlistrik_jml", "mobillistrik_jml", "kendaraan_jml", "rp_kendaraan",
  "hp_punya", "hp_jumlah", "hp_merk", "hp_provider", "rp_komunikasi",
  "elektronik_rumah", "rp_transportasi", "rp_cicilan",
];

const group5 = [
  "kerja_profesi", "kerja_status", "kerja_ket", "kerja_lokusaha",
  "kerja_sampingan", "kerja_sampingan_ket", "kerja_skalausaha",
  "nel_kategori", "nel_jenis", "nel_jenis_budidaya", "nel_alat_tangkap",
  "nel_alat_bantu", "nel_ikan_tangkap", "nel_ikan_tangkap_lain",
  "nel_ikan_kecil_perlakuan", "nel_buang_sampah", "nel_budidaya_ikan",
  "nel_budidaya_pakan", "nel_budidaya_rucah", "nel_budidaya_rumputlaut",
  "nel_budidaya_alat", "nel_pelatihan_jenis", "nel_asuransi", "nel_asuransi_rp",
  "nel_kredit", "nel_pembiayaan_budidaya", "nel_kepemilikan", "nel_waktu",
  "nel_ukurankapal", "nel_penangkapan", "nel_pelatihan", "nel_budidaya_jenis",
  "nel_biota_jenis", "nel_budidaya_sarana", "nel_sumber_air", "nel_bibit",
  "nel_produksi", "nel_hasil_jual", "nel_pernah",
  "bpjs_kes", "bpjs_tk", "menabung", "rp_tabungan", "tki", "tki_tujuan",
  "penyakit_jumlah", "penyakit_jenis", "disabilitas__dup_removed",
  "anak_asi", "anak_periksa", "anak_mpasi", "anak_tb", "anak_bb", "perokok",
  "lahan", "lahan_guna", "lahan_luasnon", "lahan_status",
  "lahan_luas_dikelola", "lahan_luas_tidakdikelola",
  "lahanmilik_irigasi", "lahanmilik_bukti", "lahanmilik_komoditas", "lahanmilik_lokasi",
  "lahangarap_luas", "lahangarap_irigasi", "lahangarap_komoditas", "lahangarap_lokasi",
  "lahansewa_luas", "lahansewa_irigasi", "lahansewa_komoditas", "lahansewa_lokasi",
  "ppkb", "ppkt", "skor_kls", "miskin_uufm", "pkb", "miskin_wb", "miskin_bps",
  "miskin_ekstrem", "asuransi_kes",
].filter((c) => c !== "disabilitas__dup_removed");

const group6 = [
  "baju_frek", "rp_sph", "makan_frek", "makan_menu", "tempat_belanja",
  "rp_belanja", "rp_pangan", "rp_non_pangan",
  "kon_beras", "kon_biskuit", "kon_jagung", "kon_kentang", "kon_mie", "kon_roti",
  "kon_singkong", "kon_sukun", "kon_ketan", "kon_sapi", "kon_ayam", "kon_babi",
  "kon_ikan_segar", "kon_ikan_asin", "kon_telur", "kon_kacang_hijau",
  "kon_kacang_merah", "kon_kacang_kedelai", "kon_kacang_mede", "kon_tahu",
  "kon_tempe", "kon_bayam", "kon_kangkung", "kon_sawi", "kon_terong", "kon_oyong",
  "kon_daun_singkong", "kon_daun_ubi", "kon_jeruk", "kon_mangga", "kon_pepaya",
  "kon_pisang", "kon_alpukat", "kon_semangka", "kon_melon", "kon_cabai",
  "kon_bamer", "kon_baput", "kon_migor", "kon_gas", "kon_garam", "kon_gula",
  "kon_susu", "kon_teh", "kon_kopi", "kon_rokok", "kon_kelor",
  "rumah_lantai", "rumah_dinding", "rumah_atap", "rumah_jamban", "rumah_kamar",
  "rumah_milik", "rumah_tingkat", "rumah_luas",
  "ternak", "ternak_sapi", "ternak_kerbau", "ternak_domba", "ternak_kambing",
  "ternak_ayam", "ternak_itik", "ternak_kuda", "ternak_babi", "ternak_ikan",
];

const groupLists = {
  identitas_keluarga: group1,
  pendidikan_kebudayaan: group2,
  infrastruktur_lingkungan: group3,
  sosial_hukum_ham: group4,
  kesehatan_kerja_jamsos: group5,
  sandang_pangan_papan: group6,
};

// --- sanity checks --------------------------------------------------------------
const seen = new Map();
for (const [group, cols] of Object.entries(groupLists)) {
  for (const c of cols) {
    if (seen.has(c)) {
      console.error(`DUPLICATE column "${c}" in groups "${seen.get(c)}" and "${group}"`);
      process.exitCode = 1;
    }
    seen.set(c, group);
  }
}
const missing = allCols.filter((c) => !seen.has(c));
const extra = [...seen.keys()].filter((c) => !allCols.includes(c));
if (missing.length) console.error("MISSING from mapping:", missing);
if (extra.length) console.error("EXTRA (not in raw list):", extra);

// --- type inference ---------------------------------------------------------
function inferType(name) {
  if (["lat", "lng"].includes(name)) return "float";
  if (["tgl_lahir", "tgl_kawin", "datamasuk"].includes(name)) return "date";
  if (name === "nik" || name === "nkk") return "string";
  if (name.startsWith("rp_")) return "float";
  if (name.startsWith("kon_")) return "float";
  const BOOLEAN_PREFIXES = ["punya_", "par_", "akta_", "bpjs_"];
  const BOOLEAN_EXACT = new Set([
    "hp_punya", "pbb_punya", "menabung", "menetap", "kulkas", "wifi",
    "rumah_pln", "rumah_solar", "pekarangan", "lahan", "ternak", "tki",
    "sampah_pilah", "sampah_olah", "perokok", "refreshing", "pelatihan",
    "responden", "miskin_bps", "miskin_ekstrem",
  ]);
  if (BOOLEAN_EXACT.has(name) || BOOLEAN_PREFIXES.some((p) => name.startsWith(p))) {
    return "boolean";
  }
  if (/_jml$|jumlah$|_kamar$|thn_datang|jml_keluarga|usia|lama_tinggal|pbb_tahunbayar/.test(name)) return "int";
  if (/_luas|_luasnon/.test(name)) return "float";
  if (["skor_kls", "ppkb", "ppkt"].includes(name)) return "float";
  return "string";
}

const ENUMS = {
  jk: ["L", "P"],
  subjek: ["Individu", "Keluarga"],
  status_kawin: ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"],
  status_dalam_keluarga: ["Kepala Keluarga", "Istri", "Anak", "Menantu", "Cucu", "Orang Tua", "Famili Lain", "Lainnya"],
  agama: ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Khonghucu", "Lainnya"],
  ijazah: ["Tidak/Belum Sekolah", "SD", "SMP", "SMA", "D1/D2/D3", "S1", "S2", "S3"],
  rumah_milik: ["Milik Sendiri", "Sewa", "Kontrak", "Menumpang", "Dinas", "Lainnya"],
  kerja_status: ["Bekerja", "Tidak Bekerja", "Belum Bekerja", "Pensiun", "Pelajar/Mahasiswa"],
};

const PERLU_KONFIRMASI = [
  "subjek", "responden", "dinamika", "aset_ekonomi", "kandung", "kesediaan",
  "kb", "pkb", "ppkb", "ppkt", "miskin_uufm", "nel_pernah", "nel_waktu",
  "nel_penangkapan", "lahanmilik_lokasi", "lahangarap_lokasi", "lahansewa_lokasi",
];

const mapping = {};
for (const [groupKey, cols] of Object.entries(groupLists)) {
  for (const c of cols) {
    mapping[c] = {
      kelompok: groupKey,
      kelompok_label: GROUPS[groupKey],
      label: c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
      tipe: inferType(c),
      ...(ENUMS[c] ? { enum: ENUMS[c] } : {}),
      perlu_konfirmasi: PERLU_KONFIRMASI.includes(c),
    };
  }
}

const counts = {};
for (const g of Object.keys(GROUPS)) counts[g] = groupLists[g].length;

const output = {
  _meta: {
    generated_by: "scripts/build-indikator-mapping.js",
    total_kolom: allCols.length,
    kelompok: GROUPS,
    jumlah_per_kelompok: counts,
    target_per_kelompok: TARGET_COUNTS,
    selisih_per_kelompok: Object.fromEntries(
      Object.keys(GROUPS).map((g) => [g, counts[g] - TARGET_COUNTS[g]])
    ),
    perlu_konfirmasi: PERLU_KONFIRMASI,
  },
  kolom: mapping,
};

fs.mkdirSync(path.join(__dirname, "..", "config"), { recursive: true });
fs.writeFileSync(
  path.join(__dirname, "..", "config", "indikator-mapping.json"),
  JSON.stringify(output, null, 2)
);

console.log("total columns:", allCols.length);
console.log("counts:", counts);
console.log("targets:", TARGET_COUNTS);
console.log("diffs:", output._meta.selisih_per_kelompok);
console.log("missing:", missing.length, "extra:", extra.length);
