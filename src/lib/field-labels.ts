import type { KolomDef } from "@/lib/indikator";

const OVERRIDES: Record<string, string> = {
  abs_id: "ID Absolut",
  subjek: "Jenis Subjek Data",
  datamasuk: "Tanggal Pendataan",
  enumerator: "Nama Petugas Pendata",
  kode_bangunan: "Kode Bangunan",
  kode_deskel: "Kode Desa/Kelurahan",
  deskel: "Desa/Kelurahan",
  dusun: "Dusun/Kampung/Dukuh",
  rw: "Rukun Warga (RW)",
  rt: "Rukun Tetangga (RT)",
  lat: "Koordinat Lintang",
  lng: "Koordinat Bujur",
  responden: "Bertindak sebagai Responden",
  nkk: "Nomor Kartu Keluarga (No. KK)",
  nama: "Nama Lengkap",
  nik: "Nomor Induk Kependudukan (NIK)",
  alamat: "Alamat Rumah",
  status_dalam_keluarga: "Hubungan dengan Kepala Keluarga",
  status_kawin: "Status Perkawinan",
  punya_ktp: "Kepemilikan KTP/KIA",
  punya_aktalahir: "Kepemilikan Akta Kelahiran",
  nama_kepala_rumah: "Nama Kepala Rumah Tangga",
  nama_tulang_punggung: "Nama Tulang Punggung Keluarga",
  no_hp: "Nomor HP/WhatsApp Responden",
  jml_keluarga: "Jumlah Anggota Keluarga",
  tgl_lahir: "Tanggal Lahir",
  jk: "Jenis Kelamin",
  thn_datang: "Tahun Datang ke Desa",
  dinamika: "Dinamika Kehidupan",
  bhs_keluarga: "Bahasa dalam Keluarga",
  bhs_daerah: "Bahasa Daerah yang Dikuasai",
  tgl_kawin: "Tanggal Perkawinan",
  usia_dec: "Usia Desimal",
  lama_tinggal: "Lama Tinggal (Tahun)",
  punya_kk: "Kepemilikan Kartu Keluarga",
  menetap: "Tinggal Menetap",
  dead_jml: "Jumlah Anggota Keluarga yang Meninggal",
  akta_nikah: "Kepemilikan Akta Nikah",
  akta_cerai: "Kepemilikan Akta Perceraian",
  partisipasi_sekolah: "Partisipasi Sekolah",
  ijazah: "Pendidikan/Ijazah Terakhir",
  rp_pendidikan: "Pengeluaran Pendidikan per Bulan (Rp)",
  pendidikan_anggota: "Jumlah Anggota Keluarga yang Bersekolah",
  pelatihan_ket: "Jenis Pelatihan yang Diikuti",
  refreshing: "Kegiatan Rekreasi Keluarga",
  pekarangan_luas: "Luas Pekarangan (m²)",
  rumah_pln: "Sambungan Listrik PLN",
  rp_listrik: "Pengeluaran Listrik per Bulan (Rp)",
  wifi: "Akses Internet/Wi-Fi",
  airbersih: "Sumber Air Bersih",
  airminum: "Sumber Air Minum",
  bahanbakar_masak: "Bahan Bakar Memasak",
  rumah_solar: "Pemanfaatan Panel Surya",
  par_organisasi: "Partisipasi dalam Organisasi",
  organisasi_nama: "Nama Organisasi yang Diikuti",
  par_masyarakat: "Partisipasi Kegiatan Masyarakat",
  par_pemilu: "Partisipasi Pemilu/Pilkada/Pilkades",
  par_kebijakan: "Partisipasi Perencanaan Kebijakan",
  bansos: "Bantuan Sosial yang Diterima",
  nomor_objek_pajak: "Nomor Objek Pajak (NOP)",
  pbb_punya: "Kepemilikan Pajak Bumi dan Bangunan (PBB)",
  pbb_tahunbayar: "Tahun Terakhir Membayar PBB",
  kesediaan: "Kesediaan Menjadi Responden",
  medsos: "Media Sosial yang Digunakan",
  aset_ekonomi: "Aset Ekonomi yang Dimiliki",
  kb: "Keikutsertaan Keluarga Berencana (KB)",
  hp_punya: "Kepemilikan Telepon Seluler",
  hp_jumlah: "Jumlah Telepon Seluler",
  hp_merk: "Merek Telepon Seluler",
  hp_provider: "Provider Telekomunikasi",
  rp_komunikasi: "Pengeluaran Komunikasi per Bulan (Rp)",
  rp_transportasi: "Pengeluaran Transportasi per Bulan (Rp)",
  rp_cicilan: "Pengeluaran Cicilan per Bulan (Rp)",
  rp_sph: "Biaya Sandang, Papan, dan Hiburan (Rp)",
  kerja_profesi: "Pekerjaan/Profesi Utama",
  kerja_status: "Status Pekerjaan",
  kerja_ket: "Keterangan Pekerjaan Utama",
  kerja_lokusaha: "Lokasi Pekerjaan/Usaha",
  kerja_sampingan: "Pekerjaan Sampingan",
  kerja_sampingan_ket: "Keterangan Pekerjaan Sampingan",
  kerja_skalausaha: "Skala Usaha",
  bpjs_kes: "Kepesertaan BPJS Kesehatan",
  bpjs_tk: "Kepesertaan BPJS Ketenagakerjaan",
  tki: "Anggota Keluarga Bekerja sebagai TKI",
  tki_tujuan: "Negara Tujuan TKI",
  anak_asi: "Pemberian ASI Eksklusif",
  anak_periksa: "Pemeriksaan Kesehatan Anak",
  anak_mpasi: "Makanan Pendamping ASI (MPASI)",
  anak_tb: "Tinggi Badan Anak (cm)",
  anak_bb: "Berat Badan Anak (kg)",
  miskin_bps: "Status Kemiskinan BPS",
  miskin_ekstrem: "Status Kemiskinan Ekstrem",
  rumah_lantai: "Jenis Lantai Terluas",
  rumah_dinding: "Jenis Dinding Terluas",
  rumah_atap: "Jenis Atap Terluas",
  rumah_jamban: "Jenis Jamban",
  rumah_kamar: "Jumlah Kamar",
  rumah_milik: "Status Kepemilikan Rumah",
  rumah_tingkat: "Jumlah Tingkat Bangunan",
  rumah_luas: "Luas Bangunan Rumah (m²)",
};

const WORDS: Record<string, string> = {
  rp: "Nilai (Rp)",
  jml: "Jumlah",
  tgl: "Tanggal",
  thn: "Tahun",
  bhs: "Bahasa",
  par: "Partisipasi",
  kon: "Konsumsi",
  nel: "Nelayan",
  ket: "Keterangan",
  frek: "Frekuensi",
  punya: "Kepemilikan",
  jk: "Jenis Kelamin",
  nik: "NIK",
  nkk: "No. KK",
  kk: "KK",
  ktp: "KTP",
  hp: "HP",
  bpjs: "BPJS",
  pbb: "PBB",
  asi: "ASI",
  mpasi: "MPASI",
  tki: "TKI",
  pln: "PLN",
  wifi: "Wi-Fi",
  bps: "BPS",
  stnk: "STNK",
  uufm: "UuFm",
  wb: "World Bank",
  luasnon: "Luas Nonproduktif",
  lahanmilik: "Lahan Milik",
  lahangarap: "Lahan Garapan",
  lahansewa: "Lahan Sewa",
  lapusaha: "Lapangan Usaha",
  kerjapasca: "Pekerjaan Pascabencana",
  kesfungsional: "Kesehatan Fungsional",
  bagianrusak: "Bagian Rusak",
  ketenum: "Ketenagakerjaan Umum",
  bamer: "Bawang Merah",
  baput: "Bawang Putih",
  migor: "Minyak Goreng",
  sph: "Sandang per Hari",
};

function titleCase(word: string) {
  return word.length ? word[0].toUpperCase() + word.slice(1) : word;
}

/** A single display-name source for every database-backed field in the UI. */
export function fieldLabel(name: string, def?: Pick<KolomDef, "label">) {
  if (OVERRIDES[name]) return OVERRIDES[name];
  const generated = name
    .split("_")
    .map((word) => WORDS[word] ?? titleCase(word))
    .join(" ");
  if (generated && generated !== titleCase(name)) return generated;
  return (def?.label ?? generated)
    .replace(/\bNik\b/g, "NIK")
    .replace(/\bNkk\b/g, "No. KK")
    .replace(/\bRw\b/g, "RW")
    .replace(/\bRt\b/g, "RT")
    .replace(/\bHp\b/g, "HP")
    .replace(/\bBpjs\b/g, "BPJS")
    .replace(/\bPbb\b/g, "PBB")
    .replace(/\bKtp\b/g, "KTP")
    .replace(/\bKk\b/g, "KK");
}

export function enumOptionLabel(field: string, value: string) {
  if (field === "jk") return value === "L" ? "Laki-laki" : value === "P" ? "Perempuan" : value;
  return value;
}
