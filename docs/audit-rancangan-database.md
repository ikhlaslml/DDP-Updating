# Audit Rancangan-Database-Dashboard-Layanan-Desa.xlsx

## Kesimpulan

Berkas merupakan draf kamus data, bukan data dummy dan belum aman dijadikan migrasi. Enam sheet memuat 127 definisi kolom: Profil Desa (22), Warga (23), Layanan (17), Dokumen Request (13), Batch Update (22), dan Staging Update (30).

`tbl_warga` hanya mewakili sekitar 17 dari 286 indikator DDP yang digunakan aplikasi. Beberapa definisi berisiko merusak data: `responden` dijadikan UUID/primary key, `nkk` dijadikan UUID dan diarahkan ke desa, `nama` hanya 16 karakter, `status_kawin` bertipe tanggal, `no_hp` hanya 5 karakter, `tgl_lahir` varchar(150), serta default `jk`, `thn_datang`, dan `dinamika` tidak selaras dengan maknanya.

Workbook juga merujuk tabel yang tidak disertakan, seperti `tbl_pengguna`, `tbl_request_layanan`, dan `tbl_request_detail`. Karena itu workbook diperlakukan sebagai daftar kebutuhan bisnis yang harus direkonsiliasi, bukan sumber skema SQL.

## Pemetaan ke model aplikasi

| Sheet | Keputusan pilot |
| --- | --- |
| Profil Desa | Gabungkan ke `Desa` dan `PengaturanDesa`; jangan membuat profil tenant kedua. |
| Warga | Pertahankan `Penduduk` 286 kolom sebagai baseline/adaptor API; jangan migrasikan `tbl_warga`. |
| Layanan | Selaraskan dengan `SuratTemplate`/`SuratTerbit`; workflow request umum ditunda sampai use case disetujui. |
| Dokumen Request | Gunakan model media tenant-scoped untuk fitur dalam ruang lingkup; workflow request umum ditunda. |
| Batch Update | Evolusi `Snapshot` setelah kontrak batch Ruby tersedia; hindari tabel duplikat sekarang. |
| Staging Update | Evolusi `StagingChange`; field generik workbook tidak menggantikan payload 286 indikator. |

## Tabel tambahan yang dibutuhkan oleh enam fitur

- `MediaAsset`: metadata file per tenant, storage key, MIME, ukuran, dan uploader.
- `SesiPendataanBangunan`: identitas/foto responden append-only per bangunan dan periode.
- `ProgresKeluarga`: status aspek 1 sampai 6 per NKK, bangunan, tenant, dan periode.
- perluasan `SuratTerbit`: snapshot isi, kop, logo, actor, dan dokumen agar cetak ulang deterministik.
- perluasan `PengaturanDesa`: referensi logo tenant.
- `Komoditas` dan `HargaKomoditas`: katalog global dan harga tenant/periode.

Model baru menggunakan `desaId` wajib. Tabel lama tidak dibuat ulang agar data yang telah ada tetap kompatibel. Migrasi baru yang ditambahkan pada pekerjaan ini disertai `rollback.sql` sebagai prosedur pembalikan eksplisit.

## Pembaruan audit: bangunan, frekuensi liburan, dan staging

### Kode bangunan dan relasi KK

Kode bangunan adalah identifier **lokal per desa/kode deskel**, bukan nomor global aplikasi. Bentuk relasi yang dipakai aplikasi dan selaras dengan proses DDP adalah:

```text
Desa/kode deskel -> Bangunan (kode 1..N) -> satu atau lebih KK/NKK -> anggota penduduk
```

Seed demo sekarang membentuk kode `1, 2, 3, ...` pada setiap desa, dan sebagian bangunan sengaja ditempati dua KK agar alur daftar keluarga, peta, dan statistik menguji kasus nyata. Setiap anggota sebuah KK menerima `kode_bangunan`, alamat, dan jumlah anggota yang sama. Kode dari CSV/API DDP asli tidak boleh diubah karena merupakan identifier sumber, termasuk untuk pemanggilan foto bangunan.

Data demo lama yang masih memakai kode `100000+` tidak diubah saat deploy. Alat admin `db:resequence:demo-buildings` menyediakan dry-run dan apply eksplisit setelah backup; ia menolak tenant dengan campuran kode kecil/data nyata, menyelaraskan nilai dummy `refreshing` Ya/Tidak, dan tidak menulis ulang snapshot riwayat yang immutable.

### Frekuensi liburan keluarga

Kolom baseline DDP bernama `refreshing` bertipe `character varying`, tetapi makna normalisasinya adalah **frekuensi liburan keluarga dalam satu tahun**, bukan boolean. Nilai yang digunakan UI dan validasi adalah `tidak pernah`, `1x`, `2x`, `3x`, dan `lebih dari 3x`. Field dipindahkan dari kelompok Pendidikan dan Kebudayaan ke Sandang, Pangan, dan Papan serta diwariskan dari kepala keluarga ke seluruh anggota dalam NKK yang sama.

### Batas implementasi staging saat ini

`tbl_batch_update` dan `tbl_staging_update` dalam workbook adalah rancangan generik. Padanannya saat ini ialah `Snapshot` (periode T0/T1/...) dan `StagingChange` (delta atomik, `groupId`, payload 286 indikator, serta status PENDING/MERGED). Keduanya tetap dipertahankan; tabel workbook tidak dibuat sebagai duplikat.

Perluasan aditif untuk integrasi API/batch nanti dapat menambahkan batch sumber, business key, data sebelum, daftar field berubah, hash sumber, dan hasil validasi ke atas `StagingChange`. Status approval tidak dibuat lebih dahulu karena belum ada kontrak proses approval maupun berkas staging sumber yang menetapkan maknanya.
