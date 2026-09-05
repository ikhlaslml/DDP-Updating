# Rekonsiliasi Periode Updating

## Sumber dan aturan

Sumber kebenaran adalah `config/sources/merge_pertanyaan.csv`. Generator hanya
memakai baris `status = 0`, `header` tidak kosong, dan `header` yang ada di
`config/indikator-mapping.json`. Pemetaan periode:

- `Insidentil` → `INCIDENTAL`
- `6 bulan` → `SIX_MONTHS`
- `Tahunan` → `ANNUAL`
- `Tidak Berubah` → `IMMUTABLE`

`alamat_ktp` adalah satu-satunya header aktif yang tidak ada di skema. Baris
tersebut dilewati dan tidak pernah menambah kolom baru.

## Hasil verifikasi generator

- Total baris: 336
- Aktif (`status = 0`): 294
- Tidak aktif (`status = 1`): 42
- Kolom skema terklasifikasi: 229 dari 286
- Kolom unik subjek kepala, sebelum melewati header asing: 224
- Kolom kepala yang benar-benar ada di skema: 223
- Kolom unik subjek anggota: 66
- Hanya kepala: 164 mentah, atau 163 setelah `alamat_ktp` dilewati
- Hanya anggota: 6
- Ditanyakan kepada keduanya: 60
- Siklus 6 bulan: 81 (kepala 78, anggota 32)
- Siklus 1 tahun: 26 (kepala 26, anggota 3)

Perbedaan 224/223 dan 164/163 bukan kehilangan metadata. Masing-masing selisih
satu berasal dari `alamat_ktp`, yang memang tidak memiliki kolom skema.

Enam kolom khusus anggota: `anak_asi`, `anak_periksa`, `anak_mpasi`,
`anak_tb`, `anak_bb`, dan `nel_budidaya_jenis`.

## Konflik metadata lama yang dimenangkan CSV

- `nama`: `INCIDENTAL` → `SIX_MONTHS`. Tetap dikunci di halaman berkala karena
  perubahan nama adalah koreksi identitas.
- `korban_kejahatan`: `SIX_MONTHS` → `ANNUAL`.
- `ternak`: `INCIDENTAL` → `SIX_MONTHS`.
- `kon_biskuit`: `SIX_MONTHS` → `INCIDENTAL`.

Perbedaan periode sah antarperan dipertahankan untuk `partisipasi_sekolah`,
`disabilitas`, dan `agama` melalui `frequencyByRole`.

## Klasifikasi 57 kolom tanpa periode CSV

### Teknis dan identitas — 15, tetap dipakai

`abs_id`, `subjek`, `datamasuk`, `enumerator`, `kode_bangunan`,
`kode_deskel`, `deskel`, `dusun`, `rw`, `rt`, `lat`, `lng`, `usia`,
`usia_dec`, `lama_tinggal`.

Kolom ini merupakan identitas, lokasi, nilai turunan runtime, atau kontrak
integrasi. Karena bukan pertanyaan berkala, kolom tersebut tidak memerlukan
frekuensi.

### Pemicu kondisi — 2, tetap menjadi input

`nel_kategori` dan `penyakit_jumlah`.

Keduanya tetap `frequency: null` dan `conditionOnly: true`. Nilainya menentukan
apakah pertanyaan turunan ditampilkan, sehingga menghapusnya akan memutus
percabangan kuesioner.

### Indikator turunan — 9, dipensiunkan dari UI

`miskin_bps`, `miskin_ekstrem`, `miskin_uufm`, `miskin_wb`, `miskin_bpsd`,
`skor_kls`, `ppkb`, `ppkt`, `pkb`.

Nilai ini adalah hasil klasifikasi atau skoring, bukan jawaban responden. Kolom
tetap ada untuk kompatibilitas data lama dan tetap diwariskan kepada anggota
baru agar satu NKK konsisten.

### Di luar kuesioner — 31, dipensiunkan dari UI

`tanah_nama`, `tanah_nomor`, `kandung`, `kulkas`, `perokok`, `rp_belanja`,
`nel_alat_bantu`, `nel_ikan_tangkap_lain`, `nel_budidaya_ikan`,
`nel_budidaya_pakan`, `nel_budidaya_rucah`, `nel_budidaya_rumputlaut`,
`nel_budidaya_alat`, `nel_asuransi_rp`, `nel_kredit`,
`nel_pembiayaan_budidaya`, `bencana_kesfungsional`, `bencana_lap_usaha`,
`bencana_lapusaha_nama`, `bencana_lapusaha_alamat`,
`bencana_lapusaha_izin`, `bencana_lapusaha_omzet`,
`bencana_lapusaha_tk`, `bencana_kerja_pasca`,
`bencana_kerjapasca_lokasi`, `bencana_kerjapasca_penghasilan`,
`bencana_kerjapasca_harapan`, `bencana_pemulihan_pasca`,
`bencana_rumah_kondisi`, `bencana_rumah_bagianrusak`,
`bencana_ketenum_bangunan`.

Total: 15 + 2 + 9 + 31 = 57. Hanya kelompok indikator turunan dan di luar
kuesioner yang dipensiunkan, sehingga total kolom tersembunyi adalah 40.

## Rekonsiliasi `survey.ts`

Evaluasi langsung terhadap versi kode sebelum perubahan menunjukkan daftar
manual lama berisi 158 field rumah tangga, bukan 159 seperti asumsi awal.
Daftar hasil metadata berisi 163 field khusus kepala yang ada di skema,
ditambah 9 indikator turunan, sehingga total warisan rumah tangga 172.

Tambahan pada daftar warisan:

`responden`, `nkk`, `alamat`, `no_hp`, `thn_datang`, `dinamika`,
`bhs_keluarga`, `bhs_daerah`, `tgl_kawin`, `menetap`, `medsos`,
`rp_komunikasi`, `kerja_skalausaha`, `nel_jenis_budidaya`, `nel_waktu`,
`menabung`, `rp_tabungan`, `tki`, `tki_tujuan`, serta sembilan indikator
turunan.

Field yang berpindah dari daftar warisan lama ke jawaban per anggota:

`akta_nikah`, `akta_cerai`, `wifi`, `par_organisasi`, `organisasi_nama`,
`par_masyarakat`, `par_pemilu`, `par_kebijakan`, `hukum_bantuan`,
`hukum_jenis`.

Field lama yang tidak lagi menjadi input operasional:

`tanah_nama`, `tanah_nomor`, `kulkas`, dan `rp_belanja`.

Daftar anggota lama berisi 79 field. Daftar baru berisi 66 field dari CSV
ditambah dua pemicu kondisi, sehingga 68 field operasional. Daftar warisan dan
daftar anggota tidak beririsan.

## Keputusan baris “Parameter DDP estimasi waktu updating”

Baris tersebut tidak memiliki nama kolom, tipe, subjek, frekuensi, definisi,
atau satuan. Keputusan implementasi: **tidak menjadikannya parameter data,
kolom basis data, maupun isian formulir**. Menebak durasi akan mencemari kontrak
DB induk. Estimasi pekerjaan, bila nanti diperlukan, harus menjadi metrik
operasional terpisah dengan definisi dan sumber pengukuran yang disetujui.
