# Rencana arsitektur pilot DDP Updating (4 desa)

## Keputusan

Untuk pilot empat desa, `DDP-Updating` tetap satu repository Next.js modular. Repository ini **bukan frontend-only**: UI, route handler/server action, autentikasi, dan data operasional aplikasi tetap berada dalam satu deployment. Membuat `backend-ddp-updating` terpisah sekarang akan menciptakan sumber kebenaran kedua sebelum kontrak API Ruby tersedia.

Baseline sensus dibungkus oleh adapter `CensusDataSource`:

- `DDP_DATA_SOURCE=local`: membaca data dummy/cache pilot dari Neon melalui Prisma.
- `DDP_DATA_SOURCE=ruby`: server Next.js memanggil API Ruby menggunakan kode wilayah tenant dan token server. Browser tidak pernah menerima token.

Endpoint Ruby sengaja dapat dikonfigurasi melalui `DDP_API_RESIDENTS_PATH`. Nilai default hanyalah kontrak kandidat dan tidak boleh diaktifkan sebelum pemilik backend DDP menyetujui URL, skema respons, autentikasi, pagination, rate limit, dan aturan konflik.

## Kepemilikan data

| Domain | Sumber kebenaran saat pilot | Sumber kebenaran setelah API resmi |
| --- | --- | --- |
| Baseline 286 indikator penduduk | Neon/dummy | Backend Ruby DDP |
| Draft dan staging perubahan | DDP Updating | DDP Updating, lalu disinkronkan melalui kontrak mutasi |
| Sesi/responden dan media kunjungan | DDP Updating | DDP Updating |
| Progres keluarga per aspek | DDP Updating | DDP Updating |
| Pengaturan/logo desa | DDP Updating | DDP Updating |
| Surat terbit dan audit | DDP Updating | DDP Updating |
| Harga komoditas per desa/periode | DDP Updating | DDP Updating |

Situs publik hanya boleh menerima agregat atau data yang telah dianonimkan. WebGIS privat dapat memakai SSO/deep-link setelah kontrak identitas tersedia; kredensial WebGIS tidak ditanam di source code.

## Pengamanan pilot

1. Semua query dan mutasi mengambil `desaId` dari user database yang sedang login, bukan dari body atau query pengguna.
2. Media responden berada di private object storage dan hanya dikirim lewat route yang memeriksa tenant.
3. Data tenant baru menggunakan `desaId` wajib dan indeks gabungan tenant.
4. Migrasi berjalan sebagai release gate eksplisit (`npm run db:deploy`) sebelum build
   Vercel; perintah build aplikasi sendiri tidak melakukan migrasi.
5. Seed demo tidak pernah dijalankan otomatis pada deployment produksi.
6. CSV penduduk asli tidak dimasukkan ke Git, chat, log, atau build artifact.

## Cara membawa data asli empat desa

Tidak perlu mengunggah CSV berisi PII ke percakapan. Untuk pemetaan awal cukup berikan header/skema dan 5–20 baris yang sudah dianonimkan. Impor data riil dilakukan langsung dari komputer berwenang ke lingkungan database pilot melalui alat admin satu kali, dengan folder sumber berada di luar repository dan rekaman log yang tidak memuat NIK/nama/alamat.

## Kontrak minimum yang perlu diminta dari tim backend Ruby

- base URL sandbox dan produksi;
- cara autentikasi service-to-service dan rotasi token;
- endpoint daftar/detail penduduk serta bangunan untuk sebuah kode wilayah;
- bentuk pagination, filter, sort, dan kode galat;
- stable ID untuk penduduk, keluarga, bangunan, dan desa;
- endpoint mutasi atau mekanisme batch untuk perubahan yang telah disetujui;
- idempotency key, version/ETag, serta aturan penyelesaian konflik;
- audit actor, waktu server, SLA, rate limit, dan kebijakan data pribadi.

Ekstraksi ke repository backend terpisah baru layak dilakukan jika DDP Updating memiliki beberapa klien, membutuhkan worker/job independen, atau kontrak keamanan organisasi mengharuskannya.

## Kontrak handoff DB induk untuk pembaruan berkala

Perubahan September 2026 bersifat aditif. Migrasi
`20260905150000_family_periodic_updates` tidak menghapus atau mengganti satu pun
dari 286 kolom baseline. Migrasi hanya:

- menambah metadata patokan pada `PengaturanDesa`;
- memperkaya `FieldUpdate` dan menambah jurnal append-only `FieldUpdateLog`;
- menambah lima kolom wilayah migrasi pada `PeristiwaKependudukan`.

Empat puluh kolom yang dipensiunkan hanya disembunyikan dari UI dan ekspor baru.
Nilai lama tetap berada pada database, staging, dan snapshot. Karena itu tim DB
tidak perlu menjalankan `DROP COLUMN`.

Ada dua sambungan yang tidak boleh dicampur:

1. `DATABASE_URL` adalah database operasional aplikasi dan harus memiliki seluruh
   tabel pada `prisma/schema.prisma`. Mengarahkannya langsung ke database yang
   hanya mempunyai tabel produksi `ajaib` akan gagal karena aplikasi juga
   membutuhkan `User`, `Desa`, `StagingChange`, `Snapshot`, dan tabel audit.
2. `DDP_DATA_SOURCE=ruby` adalah adapter baca baseline DB induk. Token tetap di
   server. Mode ini baru aman diaktifkan setelah kontrak endpoint disepakati.

Strategi yang dipilih adalah mempertahankan database operasional DDP Updating dan
menghubungkan baseline induk melalui API resmi. Mutasi baseline induk belum boleh
diaktifkan hanya dengan mengganti variabel lingkungan: tim backend masih harus
menyediakan endpoint batch, idempotency key, versi/ETag, respons konflik, dan
acknowledgement. Sampai kontrak itu ada, penggabungan tetap menjadi transaksi
lokal yang dapat diaudit dan tidak menulis secara spekulatif ke tabel induk.

Kode wilayah migrasi berawalan `AUTO-` adalah kunci integrasi deterministik, bukan
kode Kemendagri resmi. Empat nama wilayah disimpan dalam kolom terpisah sehingga
tim induk dapat mengganti kunci tersebut melalui master wilayah tanpa membongkar
JSON atau kehilangan data asal.

### Urutan release database

1. Backup database operasional.
2. Jalankan `npm run build:updating-metadata` dan
   `npm run verify:updating-contract`.
3. Tinjau SQL migrasi dan jalankan `npm run db:deploy` menggunakan koneksi
   langsung/non-pooling.
4. Deploy aplikasi setelah migrasi sukses.
5. Uji dua tenant, masing-masing dengan operator dan pemerintah desa.
6. Aktifkan adapter induk hanya di sandbox; jangan langsung di produksi.

## Integrasi foto bangunan Core DDP

Endpoint read-only `GET /api/v1/foto-bangunan?kode=...&kode_deskel=...` telah diverifikasi mengembalikan array metadata dan URL Google Cloud Storage bertanda tangan. DDP Updating tidak menyimpan URL `foto` karena URL tersebut kedaluwarsa. Route server mengambil `kode_deskel` dari tenant login, memastikan kode bangunan benar-benar milik tenant, meminta URL terbaru ke Core DDP, lalu mem-proxy byte gambar ke pengguna yang terautentikasi. Endpoint ini tidak dipakai untuk foto responden.
