# Dashboard Kependudukan Desa (Data Desa Presisi)

Dashboard kependudukan desa dengan skema data penuh sensus DDP (269 kolom),
CRUD lengkap, autentikasi, statistik/grafik, peta sebaran, dan impor/ekspor
CSV/Excel.

## Stack

- Next.js 16 (App Router, TypeScript), Tailwind CSS
- Prisma ORM — SQLite untuk pengembangan lokal, siap dipindah ke PostgreSQL
- Auth.js (NextAuth v5) dengan Credentials provider (email + password)
- Recharts (grafik), react-leaflet/Leaflet (peta), TanStack Table (tabel)
- xlsx + papaparse (impor/ekspor Excel & CSV), zod (validasi)

## Struktur penting

- `config/indikator-mapping.json` — satu file sumber kebenaran yang memetakan
  seluruh 269 kolom ke 6 kelompok indikator. Edit file ini untuk mengoreksi
  pemetaan kolom, lalu jalankan `npm run build:mapping` untuk regenerasi
  `prisma/schema.prisma` secara otomatis.
- `scripts/build-indikator-mapping.js` — generator `config/indikator-mapping.json`
  dari daftar kolom mentah (`scripts/columns-raw.txt`), termasuk aturan
  penentuan tipe data dan daftar `perlu_konfirmasi`.
- `scripts/build-prisma-schema.js` — generator `prisma/schema.prisma` (model
  `Penduduk`) dari `config/indikator-mapping.json`.
- `docs/inspeksi-situs-referensi.md` — hasil (dan kendala) inspeksi situs
  referensi staging, dipakai sebagai spesifikasi fitur.
- `prisma/seed.ts` — seed 220 data penduduk dummy realistis yang mengisi
  seluruh kolom, plus satu user admin untuk login.
- `tools/inspect/` — alat Playwright: `inspect.mjs` untuk mengeksplorasi situs
  referensi, `verify-app.mjs` untuk smoke-test visual aplikasi ini sendiri.

## Instalasi

```bash
npm install
cp .env.example .env
```

Edit `.env` bila perlu (nilai default sudah bisa langsung dipakai untuk
pengembangan lokal dengan SQLite). Generate `AUTH_SECRET` baru dengan:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Migrasi & seed database

```bash
npx prisma migrate dev --name init
npm run db:seed
```

Seed membuat user login default `admin@ddp.local` / `Admin12345!` (bisa
diubah lewat `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` di `.env` sebelum
menjalankan seed) dan 220 data penduduk dummy yang mengisi seluruh 269 kolom.

## Menjalankan aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Aplikasi akan
mengarahkan ke halaman login untuk seluruh halaman dashboard.

> Catatan Windows: proyek ini menjalankan `next dev`/`next build` dengan flag
> `--webpack` (lihat `package.json`) karena Turbopack mengalami crash saat
> memproses `globals.css` di lingkungan pengembangan ini (worker process
> Turbopack keluar dengan kode `0xc0000142`). Webpack berjalan normal.

### Build produksi

```bash
npm run build
npm start
```

## Skema data & pemetaan indikator

Seluruh 269 kolom hasil sensus DDP (lihat bagian 3 spesifikasi) tersimpan
dalam satu model `Penduduk`. Tipe data disimpulkan otomatis dari nama kolom
(`rp_*` → angka rupiah, `kon_*` → angka konsumsi, `tgl_*`/`datamasuk` →
tanggal, dst.) oleh `scripts/build-indikator-mapping.js`.

Pengelompokan ke 6 variabel indikator (jumlah aktual vs target dari
spesifikasi):

| Kelompok | Target | Aktual | Selisih |
|---|---|---|---|
| Identitas Keluarga | 41 | 41 | 0 |
| Pendidikan dan Kebudayaan | 9 | 9 | 0 |
| Infrastruktur dan Lingkungan Hidup | 16 | 16 | 0 |
| Kehidupan Sosial, Perlindungan Hukum dan HAM | 50 | 50 | 0 |
| Kesehatan, Pekerjaan, dan Jaminan Sosial | 72 | 80 | +8 |
| Sandang, Pangan, dan Papan | 71 | 73 | +2 |

Total kolom aktual (269) melebihi total target tabel (259) sebanyak 10 kolom —
selisih ini dilaporkan apa adanya sesuai instruksi ("jangan memaksakan atau
mengarang"), bukan dipaksakan agar pas. Lihat `config/indikator-mapping.json`
kunci `_meta.perlu_konfirmasi` untuk daftar kolom yang penempatan
kelompoknya masih ambigu dan sebaiknya dikonfirmasi.

## Fitur

- **Autentikasi**: login email/password (Auth.js Credentials), seluruh
  halaman dashboard dan API `/api/penduduk/*` diproteksi lewat `src/proxy.ts`.
- **CRUD**: tambah (form multi-langkah per kelompok indikator dengan
  stepper), lihat detail (dikelompokkan per indikator), ubah, hapus (dengan
  konfirmasi) — `src/app/(dashboard)/penduduk/*`.
- **Tabel data**: pagination server-side, pencarian (nama/NIK/NKK/alamat),
  filter (dusun/RW/RT/jenis kelamin/status kemiskinan), sorting, toggle
  visibilitas kolom yang dikelompokkan per indikator (TanStack Table).
- **Statistik & grafik**: kartu ringkasan, piramida penduduk, komposisi
  pendidikan/pekerjaan/agama, indikator kemiskinan (Recharts, palet warna
  divalidasi untuk aksesibilitas buta warna).
- **Peta sebaran**: Leaflet + OpenStreetMap, satu marker per keluarga/
  bangunan, pewarnaan berdasarkan indikator kemiskinan terpilih.
- **Impor/ekspor**: impor CSV/Excel dengan validasi header dan laporan baris
  gagal per baris, ekspor hasil filter maupun seluruh data ke CSV/Excel,
  unduh template kosong.
- **Validasi**: NIK/NKK wajib 16 digit, tanggal valid, angka non-negatif
  untuk kolom jumlah/rupiah, koordinat dibatasi rentang wilayah Indonesia.

## Deploy ke Vercel

1. Siapkan database Postgres (mis. Supabase/Neon/Vercel Postgres).
2. Di `prisma/schema.prisma`, ubah `datasource db { provider = "sqlite" }`
   menjadi `provider = "postgresql"`.
3. Jalankan `npx prisma migrate dev` sekali secara lokal terhadap database
   Postgres tersebut untuk membuat migration yang kompatibel (SQLite dan
   Postgres bisa berbeda pada beberapa detail SQL), lalu commit folder
   `prisma/migrations` yang baru.
4. Di Vercel, set environment variables: `DATABASE_URL` (connection string
   Postgres), `AUTH_SECRET` (random 32-byte hex). `AUTH_TRUST_HOST` tidak
   perlu diset di Vercel (Vercel sudah dipercaya secara default oleh Auth.js);
   variabel ini hanya diperlukan saat menjalankan `npm start` di luar Vercel.
5. Set build command `npm run build` (Vercel mendeteksi Next.js otomatis).
   Tambahkan `prisma migrate deploy` ke build step (mis. lewat
   `"build": "prisma migrate deploy && next build --webpack"`) atau jalankan
   migrasi secara manual sebelum deploy pertama.
6. Jalankan `npm run db:seed` terhadap database produksi jika ingin data awal
   (opsional — biasanya untuk produksi data diisi lewat impor CSV/Excel).

## Keamanan

- Jangan pernah commit `.env` atau `tools/inspect/.env.inspect.local` — kedua
  file ini sudah masuk `.gitignore`.
- Ganti `AUTH_SECRET` dan password admin default sebelum digunakan di
  lingkungan produksi.
