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

## Integrasi foto bangunan Core DDP

Endpoint read-only `GET /api/v1/foto-bangunan?kode=...&kode_deskel=...` telah diverifikasi mengembalikan array metadata dan URL Google Cloud Storage bertanda tangan. DDP Updating tidak menyimpan URL `foto` karena URL tersebut kedaluwarsa. Route server mengambil `kode_deskel` dari tenant login, memastikan kode bangunan benar-benar milik tenant, meminta URL terbaru ke Core DDP, lalu mem-proxy byte gambar ke pengguna yang terautentikasi. Endpoint ini tidak dipakai untuk foto responden.
