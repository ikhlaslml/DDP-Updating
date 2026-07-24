-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Desa" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Desa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "desaId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'operator',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Penduduk" (
    "id" TEXT NOT NULL,
    "desaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "abs_id" TEXT,
    "subjek" TEXT,
    "datamasuk" TIMESTAMP(3),
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
    "tgl_lahir" TIMESTAMP(3),
    "jk" TEXT,
    "thn_datang" INTEGER,
    "dinamika" TEXT,
    "agama" TEXT,
    "suku" TEXT,
    "bhs_keluarga" TEXT,
    "bhs_daerah" TEXT,
    "tgl_kawin" TIMESTAMP(3),
    "usia" DOUBLE PRECISION,
    "usia_dec" DOUBLE PRECISION,
    "lama_tinggal" INTEGER,
    "punya_kk" TEXT,
    "menetap" TEXT,
    "dead_jml" INTEGER,
    "akta_nikah" TEXT,
    "akta_cerai" TEXT,
    "partisipasi_sekolah" TEXT,
    "ijazah" TEXT,
    "rp_pendidikan" DOUBLE PRECISION,
    "bantuan_pendidikan" TEXT,
    "pendidikan_anggota" INTEGER,
    "keterampilan" TEXT,
    "pelatihan" TEXT,
    "pelatihan_ket" TEXT,
    "refreshing" TEXT,
    "pekarangan" TEXT,
    "pekarangan_luas" DOUBLE PRECISION,
    "pekarangan_air" TEXT,
    "pekarangan_tinggi" TEXT,
    "pekarangan_jenis" TEXT,
    "pekarangan_komoditas" TEXT,
    "sampah_buang" TEXT,
    "sampah_pilah" TEXT,
    "sampah_olah" TEXT,
    "rumah_pln" TEXT,
    "rp_listrik" DOUBLE PRECISION,
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
    "rp_zakat" DOUBLE PRECISION,
    "wakaf" TEXT,
    "rp_persepuluh" DOUBLE PRECISION,
    "rp_dharma" DOUBLE PRECISION,
    "rp_paramita" DOUBLE PRECISION,
    "rp_sumbangan" DOUBLE PRECISION,
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
    "rp_kendaraan" DOUBLE PRECISION,
    "hp_punya" TEXT,
    "hp_jumlah" INTEGER,
    "hp_merk" TEXT,
    "hp_provider" TEXT,
    "rp_komunikasi" DOUBLE PRECISION,
    "elektronik_rumah" TEXT,
    "rp_transportasi" DOUBLE PRECISION,
    "rp_cicilan" DOUBLE PRECISION,
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
    "nel_asuransi_rp" DOUBLE PRECISION,
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
    "rp_tabungan" DOUBLE PRECISION,
    "tki" TEXT,
    "tki_tujuan" TEXT,
    "penyakit_jumlah" INTEGER,
    "penyakit_jenis" TEXT,
    "anak_asi" TEXT,
    "anak_periksa" TEXT,
    "anak_mpasi" TEXT,
    "anak_tb" DOUBLE PRECISION,
    "anak_bb" DOUBLE PRECISION,
    "perokok" TEXT,
    "lahan" TEXT,
    "lahan_guna" TEXT,
    "lahan_luasnon" DOUBLE PRECISION,
    "lahan_status" TEXT,
    "lahan_luas_dikelola" DOUBLE PRECISION,
    "lahan_luas_tidakdikelola" DOUBLE PRECISION,
    "lahanmilik_irigasi" TEXT,
    "lahanmilik_bukti" TEXT,
    "lahanmilik_komoditas" TEXT,
    "lahanmilik_lokasi" TEXT,
    "lahangarap_luas" DOUBLE PRECISION,
    "lahangarap_irigasi" TEXT,
    "lahangarap_komoditas" TEXT,
    "lahangarap_lokasi" TEXT,
    "lahansewa_luas" DOUBLE PRECISION,
    "lahansewa_irigasi" TEXT,
    "lahansewa_komoditas" TEXT,
    "lahansewa_lokasi" TEXT,
    "ppkb" DOUBLE PRECISION,
    "ppkt" DOUBLE PRECISION,
    "skor_kls" DOUBLE PRECISION,
    "miskin_uufm" TEXT,
    "pkb" DOUBLE PRECISION,
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
    "bencana_lapusaha_omzet" DOUBLE PRECISION,
    "bencana_lapusaha_tk" INTEGER,
    "bencana_kerja_pasca" TEXT,
    "bencana_kerjapasca_lokasi" TEXT,
    "bencana_kerjapasca_penghasilan" DOUBLE PRECISION,
    "bencana_kerjapasca_harapan" TEXT,
    "bencana_pemulihan_pasca" TEXT,
    "bencana_rumah_kondisi" TEXT,
    "bencana_rumah_bagianrusak" TEXT,
    "bencana_ketenum_bangunan" TEXT,
    "baju_frek" TEXT,
    "rp_sph" DOUBLE PRECISION,
    "makan_frek" TEXT,
    "makan_menu" TEXT,
    "tempat_belanja" TEXT,
    "rp_belanja" DOUBLE PRECISION,
    "rp_pangan" DOUBLE PRECISION,
    "rp_non_pangan" DOUBLE PRECISION,
    "kon_beras" DOUBLE PRECISION,
    "kon_biskuit" DOUBLE PRECISION,
    "kon_jagung" DOUBLE PRECISION,
    "kon_kentang" DOUBLE PRECISION,
    "kon_mie" INTEGER,
    "kon_roti" INTEGER,
    "kon_singkong" DOUBLE PRECISION,
    "kon_sukun" DOUBLE PRECISION,
    "kon_ketan" DOUBLE PRECISION,
    "kon_sapi" DOUBLE PRECISION,
    "kon_ayam" DOUBLE PRECISION,
    "kon_babi" DOUBLE PRECISION,
    "kon_ikan_segar" DOUBLE PRECISION,
    "kon_ikan_asin" DOUBLE PRECISION,
    "kon_telur" DOUBLE PRECISION,
    "kon_kacang_hijau" DOUBLE PRECISION,
    "kon_kacang_merah" DOUBLE PRECISION,
    "kon_kacang_kedelai" DOUBLE PRECISION,
    "kon_kacang_mede" DOUBLE PRECISION,
    "kon_tahu" INTEGER,
    "kon_tempe" INTEGER,
    "kon_bayam" INTEGER,
    "kon_kangkung" INTEGER,
    "kon_sawi" INTEGER,
    "kon_terong" DOUBLE PRECISION,
    "kon_oyong" DOUBLE PRECISION,
    "kon_daun_singkong" INTEGER,
    "kon_daun_ubi" INTEGER,
    "kon_jeruk" DOUBLE PRECISION,
    "kon_mangga" DOUBLE PRECISION,
    "kon_pepaya" DOUBLE PRECISION,
    "kon_pisang" DOUBLE PRECISION,
    "kon_alpukat" DOUBLE PRECISION,
    "kon_semangka" DOUBLE PRECISION,
    "kon_melon" DOUBLE PRECISION,
    "kon_cabai" DOUBLE PRECISION,
    "kon_bamer" DOUBLE PRECISION,
    "kon_baput" DOUBLE PRECISION,
    "kon_migor" DOUBLE PRECISION,
    "kon_gas" DOUBLE PRECISION,
    "kon_garam" DOUBLE PRECISION,
    "kon_gula" DOUBLE PRECISION,
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
    "rumah_luas" DOUBLE PRECISION,
    "ternak" TEXT,
    "ternak_sapi" INTEGER,
    "ternak_kerbau" INTEGER,
    "ternak_domba" INTEGER,
    "ternak_kambing" INTEGER,
    "ternak_ayam" INTEGER,
    "ternak_itik" INTEGER,
    "ternak_kuda" INTEGER,
    "ternak_babi" INTEGER,
    "ternak_ikan" INTEGER,

    CONSTRAINT "Penduduk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "desaId" TEXT,
    "kode" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "label" TEXT,
    "catatan" TEXT,
    "jumlah" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnapshotPenduduk" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "nik" TEXT,
    "nkk" TEXT,
    "nama" TEXT,
    "dusun" TEXT,
    "data" TEXT NOT NULL,

    CONSTRAINT "SnapshotPenduduk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StagingChange" (
    "id" TEXT NOT NULL,
    "desaId" TEXT,
    "aksi" TEXT NOT NULL,
    "pendudukId" TEXT,
    "nik" TEXT,
    "nama" TEXT,
    "ringkasan" TEXT,
    "data" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StagingChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PengaturanDesa" (
    "id" TEXT NOT NULL,
    "desaId" TEXT,
    "namaKepala" TEXT,
    "kopBaris1" TEXT,
    "kopBaris2" TEXT,
    "kopBaris3" TEXT,
    "kopBaris4" TEXT,
    "penutup" TEXT,
    "disclaimer" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PengaturanDesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuratTemplate" (
    "id" TEXT NOT NULL,
    "desaId" TEXT,
    "nama" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuratTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuratTerbit" (
    "id" TEXT NOT NULL,
    "desaId" TEXT,
    "nomor" TEXT NOT NULL,
    "templateId" TEXT,
    "templateNama" TEXT,
    "pendudukId" TEXT,
    "namaWarga" TEXT,
    "nik" TEXT,
    "keperluan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuratTerbit_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "SnapshotPenduduk" ADD CONSTRAINT "SnapshotPenduduk_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

