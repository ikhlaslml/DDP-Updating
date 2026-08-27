# Handoff implementasi pilot DDP Updating

Tanggal verifikasi: 27 Agustus 2026. Dokumen ini merangkum implementasi enam tugas,
integrasi foto bangunan Core DDP, perubahan basis data, konfigurasi release, dan skenario
uji manual. Audit sumber data berada di `audit-rancangan-database.md` dan
`audit-borang-harga.md`.

## Hasil implementasi

1. Identitas responden menjadi langkah wajib sebelum pendataan bangunan berpenghuni.
   Nama dan foto disimpan per kunjungan/periode secara append-only bersama waktu dan
   enumerator. Foto dikompresi di browser, disimpan privat, dan draft tersimpan di
   IndexedDB agar bertahan saat refresh atau koneksi terputus.
2. Penambahan keluarga baru, baik pada bangunan baru maupun lama, hanya menampilkan
   Aspek 1 Identitas Keluarga. Setelah disimpan, pengguna kembali ke detail bangunan
   dengan badge `Belum lengkap`; Aspek 2–6 dilanjutkan melalui alur edit.
3. Riwayat layanan dipindahkan ke tab Riwayat Surat. Fitur pencarian, jenis surat,
   rentang tanggal, paginasi, cetak, dan unduh PDF tersedia; URL lama mengarah ke tab baru.
   Isi, data warga, kop, logo, dan actor dibekukan ketika surat diterbitkan.
4. Pengaturan mempunyai pengunggah logo PNG/JPG/SVG maksimal 2 MB. Logo tenant tampil
   pada kop pratinjau, cetak, dan PDF; surat lama tetap memakai snapshot logo pada saat terbit.
5. Menu Harga Komoditas memakai 45 master dari `Borang Harga.xlsx` tanpa menebak
   subkategori. Tabel mendukung edit inline, simpan massal, impor/ekspor XLSX, harga
   terakhir, sumber, pengisi, dan riwayat antarperiode per desa.
6. Data Penduduk mempunyai enam checkbox aspek, pilih semua, bersihkan, hitungan kolom,
   URL `?aspek=...`, tiga kolom inti sticky, dan ekspor Excel/CSV sesuai kolom aktif.
7. Foto bangunan Core DDP ditembak dari route server berdasarkan kode bangunan dan
   `kodeWilayah` tenant. Signed URL Google Storage tidak disimpan atau dikirim ke browser.

## Migrasi yang dijalankan

Jalankan backup database lebih dulu, lalu `npm run db:deploy`. Pada Vercel perintah ini
menjadi release gate melalui `vercel.json` dan tidak menjalankan seed.

| Urutan | Migrasi | Isi |
| --- | --- | --- |
| 1 | `20260827110000_respondent_identity` | `MediaAsset`, `SesiPendataanBangunan` |
| 2 | `20260827120000_family_progress` | `ProgresPendataanKeluarga` |
| 3 | `20260827130000_letter_history` | snapshot/audit `SuratTerbit`, `NomorSuratCounter` |
| 4 | `20260827140000_village_logo` | referensi logo pada `PengaturanDesa` |
| 5 | `20260827150000_commodity_prices` | `Komoditas`, `HargaKomoditas`, dan 45 master borang |

Setiap folder mempunyai `rollback.sql`. Rollback bersifat manual dan menghapus data fitur;
jalankan hanya setelah backup, dalam urutan terbalik 1500 → 1400 → 1300 → 1200 → 1100.
Prisma tidak menjalankan file rollback tersebut secara otomatis.

## Variabel lingkungan

- Wajib yang sudah ada: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`,
  `AUTH_TRUST_HOST`.
- Baru untuk media privat: `BLOB_READ_WRITE_TOKEN`. Hubungkan Vercel Blob private ke
  project sebelum menguji foto responden atau logo.
- Baru untuk foto bangunan: `DDP_CORE_API_BASE_URL=https://core.desapresisi.id`.
- Adapter baseline: `DDP_DATA_SOURCE=local` untuk pilot dummy. Setelah kontrak Ruby siap,
  gunakan `ruby` bersama `DDP_API_BASE_URL`, `DDP_API_TOKEN`,
  `DDP_API_RESIDENTS_PATH`, dan `DDP_API_TIMEOUT_MS`.
- Tidak ada variabel publik baru dan token tidak pernah dikirim ke bundle browser.

## Pengujian manual

### 1. Identitas responden

1. Login sebagai operator, pilih bangunan berpenghuni, lalu mulai pendataan.
2. Pastikan tombol lanjut nonaktif sebelum nama dan foto terisi. Uji kamera dan galeri;
   format selain gambar serta foto terlalu besar harus ditolak.
3. Isi keduanya, matikan jaringan/refresh, lalu pastikan draft pulih. Sambungkan jaringan,
   lanjutkan, dan periksa ringkasan pada detail bangunan.
4. Tambah kunjungan pada periode berikutnya dan ganti nama/foto. Pastikan kunjungan lama
   tetap ada. Login tenant lain dan pastikan URL media tenant pertama menghasilkan 404.

### 2. Keluarga baru

1. Tambah keluarga pada bangunan baru dan ulangi pada bangunan lama.
2. Pastikan hanya `Identitas Keluarga` yang tampil tanpa stepper enam aspek.
3. Simpan dan pastikan kembali ke daftar keluarga dengan badge `Belum lengkap`.
4. Klik `Lanjutkan pendataan`; pastikan Aspek 2–6 tersedia dan badge berubah menjadi
   `Lengkap` setelah seluruh aspek disimpan.

### 3. Riwayat surat

1. Buka `/riwayat-layanan` dan `/layanan-surat/riwayat`; keduanya harus redirect ke
   `/layanan-surat?tab=riwayat`.
2. Terbitkan surat sebagai operator, kemudian uji pencarian nomor/nama/NIK, filter jenis,
   tanggal, dan paginasi.
3. Buka cetak ulang dan unduh PDF. Pastikan pemerintah desa tidak dapat menerbitkan,
   tetapi hak baca riwayat tetap sama dengan sebelumnya.

### 4. Logo desa

1. Unggah PNG, JPG, dan SVG aman; uji berkas >2 MB dan SVG dengan script agar ditolak.
2. Pastikan preview kop berubah tanpa deploy. Terbitkan surat dan periksa cetak/PDF.
3. Ganti logo, terbitkan surat baru, lalu pastikan surat baru memakai logo baru dan PDF
   surat lama tetap memakai snapshot logo lama. Ulangi pada tenant kedua untuk isolasi.

### 5. Harga komoditas

1. Buka Pengaturan → Harga Komoditas. Pastikan ada 45 baris dalam kategori Pangan.
2. Pilih periode/sumber, isi beberapa harga, dan simpan massal. Nilai negatif/teks harus
   ditolak. Ganti periode dan pastikan riwayat serta harga terakhir tampil.
3. Impor `Borang Harga.xlsx`, ubah beberapa harga, simpan, ekspor lagi, lalu impor hasil
   ekspor. Nama/satuan/jumlah baris yang berbeda harus ditolak.
4. Login tenant lain dan pastikan harga tenant pertama tidak terlihat.

### 6. Filter aspek penduduk

1. Pilih satu dan beberapa aspek, reload, serta buka URL salinan pada tab baru.
2. Uji `Pilih semua` (286 kolom) dan `Bersihkan` (hanya NKK/NIK/nama). Gulir horizontal
   dan pastikan tiga kolom inti tetap di kiri.
3. Ekspor Excel dan CSV; cocokkan header dengan hitungan/kolom aktif dan filter baris.

### 7. Foto bangunan dan adapter Ruby

1. Pada tenant dengan `kodeWilayah` sesuai, buka detail kode bangunan yang mempunyai foto
   Core DDP. Foto harus tampil; kode yang tidak mempunyai foto tidak menampilkan kartu.
2. Coba kode milik tenant lain dan pastikan 404. Periksa respons browser: hanya byte gambar,
   bukan signed URL storage.
3. Pertahankan `DDP_DATA_SOURCE=local` sampai tim Ruby memberi sandbox, token, kontrak
   respons, pagination, mutasi, idempotency, dan aturan konflik. Jangan mengunggah CSV PII
   empat desa ke Git/chat.

## Verifikasi otomatis sebelum release

```bash
npm ci
npm run lint
npx tsc --noEmit
npx prisma validate
npm run build
```

Build, lint, TypeScript, validasi Prisma, dan pembacaan ulang 45 baris borang lulus.
`npm audit` masih melaporkan advisory transitif pada `deepmerge-ts` milik Prisma CLI
(hanya tooling build dengan konfigurasi repository tepercaya) dan `uuid` milik ExcelJS
(advisory mengenai API v3/v5/v6 dengan buffer, sedangkan ExcelJS memakai `v4()`).
Perintah `npm audit fix --force` sengaja tidak dijalankan karena justru menurunkan versi
mayor/minor Prisma dan ExcelJS. Pantau pembaruan upstream sebelum go-live penuh.

## Berkas yang berubah

- Konfigurasi/dokumentasi: `.env.example`, `.gitignore`, `README.md`, `package.json`,
  `package-lock.json`, `vercel.json`, `docs/audit-borang-harga.md`,
  `docs/audit-rancangan-database.md`, `docs/rencana-pilot-dan-integrasi-ddp.md`, dan
  dokumen handoff ini.
- Basis data: `prisma/schema.prisma`, `scripts/build-prisma-schema.js`, serta seluruh
  `migration.sql`/`rollback.sql` pada lima folder migrasi yang disebut di atas.
- Halaman: detail bangunan/penduduk, data penduduk, pengaturan, impor-ekspor, layanan
  surat, riwayat lama, dan redirect riwayat surat di `src/app/(dashboard)`.
- API: bangunan/foto/responden, media, harga komoditas, penduduk/keluarga/impor/ekspor,
  pengaturan logo, staging, snapshot export, serta surat/detail/PDF di `src/app/api`.
- Komponen: wizard bangunan/keluarga, identitas/kunjungan responden, tabel/filter aspek,
  pengaturan/logo/harga, layanan/riwayat/preview surat, dashboard, dan peta di
  `src/components`. Komponen lama `ColumnToggle.tsx` dan `SuratKeluarCard.tsx` dihapus.
- Library: `building.ts`, `census-source.ts`, `client-media.ts`, `ddp-building-photo.ts`,
  `excel-server.ts`, `family-progress.ts`, `indikator.ts`, `letter-document.ts`,
  `letter-pdf.ts`, `media-storage.ts`, dan `respondent-draft.ts` di `src/lib`.
