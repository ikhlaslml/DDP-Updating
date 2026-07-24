-- CreateTable
CREATE TABLE "Desa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "desaId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'operator',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Penduduk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "desaId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "abs_id" TEXT,
    "subjek" TEXT,
    "datamasuk" DATETIME,
    "enumerator" TEXT,
    "kode_bangunan" INTEGER,
    "kode_deskel" TEXT,
    "deskel" TEXT,
    "dusun" TEXT,
    "rw" INTEGER,
    "rt" INTEGER,
    "lat" TEXT,
    "lng" TEXT,
    "responden" TEXT,
    "nkk" TEXT,
    "nama" TEXT,
    "nik" TEXT,
    "alamat" TEXT,
    "status_dalam_keluarga" TEXT,
    "status_kawin" TEXT,
    "punya_ktp" TEXT,
    "punya_aktalahir" TEXT,
    "nama_kepala_rumah" TEXT,
    "nama_tulang_punggung" TEXT,
    "no_hp" TEXT,
    "jml_keluarga" INTEGER,
    "tgl_lahir" DATETIME,
    "jk" TEXT,
    "thn_datang" INTEGER,
    "dinamika" TEXT,
    "agama" TEXT,
    "suku" TEXT,
    "bhs_keluarga" TEXT,
    "bhs_daerah" TEXT,
    "tgl_kawin" DATETIME,
    "usia" REAL,
    "usia_dec" REAL,
    "lama_tinggal" INTEGER,
    "punya_kk" TEXT,
    "menetap" TEXT,
    "dead_jml" INTEGER,
    "akta_nikah" TEXT,
    "akta_cerai" TEXT,
    "partisipasi_sekolah" TEXT,
    "ijazah" TEXT,
    "rp_pendidikan" REAL,
    "bantuan_pendidikan" TEXT,
    "pendidikan_anggota" INTEGER,
    "keterampilan" TEXT,
    "pelatihan" TEXT,
    "pelatihan_ket" TEXT,
    "refreshing" TEXT,
    "pekarangan" TEXT,
    "pekarangan_luas" REAL,
    "pekarangan_air" TEXT,
    "pekarangan_tinggi" TEXT,
    "pekarangan_jenis" TEXT,
    "pekarangan_komoditas" TEXT,
    "sampah_buang" TEXT,
    "sampah_pilah" TEXT,
    "sampah_olah" TEXT,
    "rumah_pln" TEXT,
    "rp_listrik" REAL,
    "wifi" TEXT,
    "airbersih" TEXT,
    "airminum" TEXT,
    "bahanbakar_masak" TEXT,
    "rumah_solar" TEXT,
    "par_organisasi" TEXT,
    "organisasi_nama" TEXT,
    "par_masyarakat" TEXT,
    "par_pemilu" TEXT,
    "par_kebijakan" TEXT,
    "bansos" TEXT,
    "rp_zakat" REAL,
    "wakaf" TEXT,
    "rp_persepuluh" REAL,
    "rp_dharma" REAL,
    "rp_paramita" REAL,
    "rp_sumbangan" REAL,
    "disabilitas" TEXT,
    "korban_kejahatan" TEXT,
    "hukum_bantuan" TEXT,
    "hukum_jenis" TEXT,
    "tanah_nama" TEXT,
    "tanah_nomor" TEXT,
    "nomor_objek_pajak" TEXT,
    "tanah_bukti" TEXT,
    "pbb_punya" TEXT,
    "pbb_tahunbayar" INTEGER,
    "kesediaan" TEXT,
    "medsos" TEXT,
    "media_informasi" TEXT,
    "kandung" TEXT,
    "aset_ekonomi" TEXT,
    "pinjaman" TEXT,
    "kb" TEXT,
    "kulkas" TEXT,
    "sepeda_jml" INTEGER,
    "motor_jml" INTEGER,
    "motor_merk" TEXT,
    "mobil_jml" INTEGER,
    "mobil_merk" TEXT,
    "perahu_jml" INTEGER,
    "perahu_motor_jml" INTEGER,
    "kapal_jml" INTEGER,
    "motorlistrik_jml" INTEGER,
    "mobillistrik_jml" INTEGER,
    "kendaraan_jml" INTEGER,
    "rp_kendaraan" REAL,
    "hp_punya" TEXT,
    "hp_jumlah" INTEGER,
    "hp_merk" TEXT,
    "hp_provider" TEXT,
    "rp_komunikasi" REAL,
    "elektronik_rumah" TEXT,
    "rp_transportasi" REAL,
    "rp_cicilan" REAL,
    "kerja_profesi" TEXT,
    "kerja_status" TEXT,
    "kerja_ket" TEXT,
    "kerja_lokusaha" TEXT,
    "kerja_sampingan" TEXT,
    "kerja_sampingan_ket" TEXT,
    "kerja_skalausaha" TEXT,
    "nel_kategori" TEXT,
    "nel_jenis" TEXT,
    "nel_jenis_budidaya" TEXT,
    "nel_alat_tangkap" TEXT,
    "nel_alat_bantu" TEXT,
    "nel_ikan_tangkap" TEXT,
    "nel_ikan_tangkap_lain" TEXT,
    "nel_ikan_kecil_perlakuan" TEXT,
    "nel_buang_sampah" TEXT,
    "nel_budidaya_ikan" TEXT,
    "nel_budidaya_pakan" TEXT,
    "nel_budidaya_rucah" TEXT,
    "nel_budidaya_rumputlaut" TEXT,
    "nel_budidaya_alat" TEXT,
    "nel_pelatihan_jenis" TEXT,
    "nel_asuransi" TEXT,
    "nel_asuransi_rp" REAL,
    "nel_kredit" TEXT,
    "nel_pembiayaan_budidaya" TEXT,
    "nel_kepemilikan" TEXT,
    "nel_waktu" TEXT,
    "nel_ukurankapal" TEXT,
    "nel_penangkapan" TEXT,
    "nel_pelatihan" TEXT,
    "nel_budidaya_jenis" TEXT,
    "nel_biota_jenis" TEXT,
    "nel_budidaya_sarana" TEXT,
    "nel_sumber_air" TEXT,
    "nel_bibit" TEXT,
    "nel_produksi" TEXT,
    "nel_hasil_jual" TEXT,
    "nel_pernah" TEXT,
    "bpjs_kes" TEXT,
    "bpjs_tk" TEXT,
    "menabung" TEXT,
    "rp_tabungan" REAL,
    "tki" TEXT,
    "tki_tujuan" TEXT,
    "penyakit_jumlah" INTEGER,
    "penyakit_jenis" TEXT,
    "anak_asi" TEXT,
    "anak_periksa" TEXT,
    "anak_mpasi" TEXT,
    "anak_tb" REAL,
    "anak_bb" REAL,
    "perokok" TEXT,
    "lahan" TEXT,
    "lahan_guna" TEXT,
    "lahan_luasnon" REAL,
    "lahan_status" TEXT,
    "lahan_luas_dikelola" REAL,
    "lahan_luas_tidakdikelola" REAL,
    "lahanmilik_irigasi" TEXT,
    "lahanmilik_bukti" TEXT,
    "lahanmilik_komoditas" TEXT,
    "lahanmilik_lokasi" TEXT,
    "lahangarap_luas" REAL,
    "lahangarap_irigasi" TEXT,
    "lahangarap_komoditas" TEXT,
    "lahangarap_lokasi" TEXT,
    "lahansewa_luas" REAL,
    "lahansewa_irigasi" TEXT,
    "lahansewa_komoditas" TEXT,
    "lahansewa_lokasi" TEXT,
    "ppkb" REAL,
    "ppkt" REAL,
    "skor_kls" REAL,
    "miskin_uufm" TEXT,
    "pkb" REAL,
    "miskin_wb" TEXT,
    "miskin_bps" TEXT,
    "miskin_ekstrem" TEXT,
    "miskin_bpsd" TEXT,
    "asuransi_kes" TEXT,
    "bencana_kesfungsional" TEXT,
    "bencana_lap_usaha" TEXT,
    "bencana_lapusaha_nama" TEXT,
    "bencana_lapusaha_alamat" TEXT,
    "bencana_lapusaha_izin" TEXT,
    "bencana_lapusaha_omzet" REAL,
    "bencana_lapusaha_tk" INTEGER,
    "bencana_kerja_pasca" TEXT,
    "bencana_kerjapasca_lokasi" TEXT,
    "bencana_kerjapasca_penghasilan" REAL,
    "bencana_kerjapasca_harapan" TEXT,
    "bencana_pemulihan_pasca" TEXT,
    "bencana_rumah_kondisi" TEXT,
    "bencana_rumah_bagianrusak" TEXT,
    "bencana_ketenum_bangunan" TEXT,
    "baju_frek" TEXT,
    "rp_sph" REAL,
    "makan_frek" TEXT,
    "makan_menu" TEXT,
    "tempat_belanja" TEXT,
    "rp_belanja" REAL,
    "rp_pangan" REAL,
    "rp_non_pangan" REAL,
    "kon_beras" REAL,
    "kon_biskuit" REAL,
    "kon_jagung" REAL,
    "kon_kentang" REAL,
    "kon_mie" INTEGER,
    "kon_roti" INTEGER,
    "kon_singkong" REAL,
    "kon_sukun" REAL,
    "kon_ketan" REAL,
    "kon_sapi" REAL,
    "kon_ayam" REAL,
    "kon_babi" REAL,
    "kon_ikan_segar" REAL,
    "kon_ikan_asin" REAL,
    "kon_telur" REAL,
    "kon_kacang_hijau" REAL,
    "kon_kacang_merah" REAL,
    "kon_kacang_kedelai" REAL,
    "kon_kacang_mede" REAL,
    "kon_tahu" INTEGER,
    "kon_tempe" INTEGER,
    "kon_bayam" INTEGER,
    "kon_kangkung" INTEGER,
    "kon_sawi" INTEGER,
    "kon_terong" REAL,
    "kon_oyong" REAL,
    "kon_daun_singkong" INTEGER,
    "kon_daun_ubi" INTEGER,
    "kon_jeruk" REAL,
    "kon_mangga" REAL,
    "kon_pepaya" REAL,
    "kon_pisang" REAL,
    "kon_alpukat" REAL,
    "kon_semangka" REAL,
    "kon_melon" REAL,
    "kon_cabai" REAL,
    "kon_bamer" REAL,
    "kon_baput" REAL,
    "kon_migor" REAL,
    "kon_gas" REAL,
    "kon_garam" REAL,
    "kon_gula" REAL,
    "kon_susu" INTEGER,
    "kon_teh" INTEGER,
    "kon_kopi" INTEGER,
    "kon_rokok" INTEGER,
    "kon_kelor" INTEGER,
    "rumah_lantai" TEXT,
    "rumah_dinding" TEXT,
    "rumah_atap" TEXT,
    "rumah_jamban" TEXT,
    "rumah_kamar" INTEGER,
    "rumah_milik" TEXT,
    "rumah_tingkat" TEXT,
    "rumah_luas" REAL,
    "ternak" TEXT,
    "ternak_sapi" INTEGER,
    "ternak_kerbau" INTEGER,
    "ternak_domba" INTEGER,
    "ternak_kambing" INTEGER,
    "ternak_ayam" INTEGER,
    "ternak_itik" INTEGER,
    "ternak_kuda" INTEGER,
    "ternak_babi" INTEGER,
    "ternak_ikan" INTEGER
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "desaId" TEXT,
    "kode" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "label" TEXT,
    "catatan" TEXT,
    "jumlah" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SnapshotPenduduk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "nik" TEXT,
    "nkk" TEXT,
    "nama" TEXT,
    "dusun" TEXT,
    "data" TEXT NOT NULL,
    CONSTRAINT "SnapshotPenduduk_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StagingChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "desaId" TEXT,
    "aksi" TEXT NOT NULL,
    "pendudukId" TEXT,
    "nik" TEXT,
    "nama" TEXT,
    "ringkasan" TEXT,
    "data" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PengaturanDesa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "desaId" TEXT,
    "namaKepala" TEXT,
    "kopBaris1" TEXT,
    "kopBaris2" TEXT,
    "kopBaris3" TEXT,
    "kopBaris4" TEXT,
    "penutup" TEXT,
    "disclaimer" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SuratTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "desaId" TEXT,
    "nama" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SuratTerbit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "desaId" TEXT,
    "nomor" TEXT NOT NULL,
    "templateId" TEXT,
    "templateNama" TEXT,
    "pendudukId" TEXT,
    "namaWarga" TEXT,
    "nik" TEXT,
    "keperluan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Desa_slug_key" ON "Desa"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_desaId_idx" ON "User"("desaId");

-- CreateIndex
CREATE UNIQUE INDEX "Penduduk_abs_id_key" ON "Penduduk"("abs_id");

-- CreateIndex
CREATE UNIQUE INDEX "Penduduk_nik_key" ON "Penduduk"("nik");

-- CreateIndex
CREATE INDEX "Penduduk_desaId_idx" ON "Penduduk"("desaId");

-- CreateIndex
CREATE INDEX "Penduduk_nik_idx" ON "Penduduk"("nik");

-- CreateIndex
CREATE INDEX "Penduduk_nkk_idx" ON "Penduduk"("nkk");

-- CreateIndex
CREATE INDEX "Penduduk_dusun_idx" ON "Penduduk"("dusun");

-- CreateIndex
CREATE INDEX "Penduduk_rw_rt_idx" ON "Penduduk"("rw", "rt");

-- CreateIndex
CREATE INDEX "Snapshot_desaId_idx" ON "Snapshot"("desaId");

-- CreateIndex
CREATE UNIQUE INDEX "Snapshot_desaId_kode_key" ON "Snapshot"("desaId", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "Snapshot_desaId_urutan_key" ON "Snapshot"("desaId", "urutan");

-- CreateIndex
CREATE INDEX "SnapshotPenduduk_snapshotId_idx" ON "SnapshotPenduduk"("snapshotId");

-- CreateIndex
CREATE INDEX "SnapshotPenduduk_nik_idx" ON "SnapshotPenduduk"("nik");

-- CreateIndex
CREATE INDEX "StagingChange_status_idx" ON "StagingChange"("status");

-- CreateIndex
CREATE INDEX "StagingChange_desaId_idx" ON "StagingChange"("desaId");

-- CreateIndex
CREATE UNIQUE INDEX "PengaturanDesa_desaId_key" ON "PengaturanDesa"("desaId");

-- CreateIndex
CREATE INDEX "SuratTemplate_desaId_idx" ON "SuratTemplate"("desaId");

-- CreateIndex
CREATE INDEX "SuratTerbit_createdAt_idx" ON "SuratTerbit"("createdAt");

-- CreateIndex
CREATE INDEX "SuratTerbit_desaId_idx" ON "SuratTerbit"("desaId");
