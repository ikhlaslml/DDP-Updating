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
- `ProgresKeluarga`: status aspek 1–6 per NKK, bangunan, tenant, dan periode.
- perluasan `SuratTerbit`: snapshot isi, kop, logo, actor, dan dokumen agar cetak ulang deterministik.
- perluasan `PengaturanDesa`: referensi logo tenant.
- `Komoditas` dan `HargaKomoditas`: katalog global dan harga tenant/periode.

Model baru menggunakan `desaId` wajib. Tabel lama tidak dibuat ulang agar data yang telah ada tetap kompatibel. Setiap migrasi fitur memiliki `rollback.sql` sebagai prosedur pembalikan eksplisit.
