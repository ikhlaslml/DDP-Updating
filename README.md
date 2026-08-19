# Data Desa Presisi — Dashboard Kependudukan Desa (Multi-Tenant)

Platform kependudukan desa berbasis **Data Desa Presisi (DDP)**: skema data penuh
sensus (selaras dengan tabel produksi `ajaib`), alur **updating berperiode (T0/T1)**,
**multi-tenant per desa** dengan **RBAC** (operator vs pemerintah desa), layanan surat,
statistik, dan peta sebaran.

## Stack

- Next.js 16 (App Router, TypeScript), Tailwind CSS v4
- Prisma ORM — SQLite untuk lokal, PostgreSQL untuk produksi (Vercel)
- Auth.js (NextAuth v5), Credentials + peran `operator` / `pemerintah_desa`
- Recharts (grafik), react-leaflet/Leaflet (peta), TanStack Table (tabel)
- xlsx + papaparse (impor/ekspor), zod (validasi)

## Arsitektur singkat

- **Skema `ajaib`** — 286 kolom penduduk dengan tipe yang cocok tabel produksi
  `ajaib` (integer/numeric/character varying). Sumber kebenaran: `config/indikator-mapping.json`
  (di-generate dari `scripts/columns-raw.txt`). Referensi tipe Postgres per kolom:
  `config/penduduk-datatype.reference.csv`.
- **Updating T0/T1** — perubahan profil, kelahiran, migrasi masuk, kematian, dan
  migrasi keluar masuk ke `StagingChange`
  ("Data Perubahan Sementara"). Klik **Gabungkan** menerapkannya ke baseline lalu
  membekukan `Snapshot` baru (`T1`, `T2`, …) yang immutable. Kematian dipindahkan
  ke arsip khusus, sedangkan migrasi keluar mempertahankan penduduk sebagai data nonaktif.
- **Jadwal parameter** — metadata 286 kolom menggabungkan periode insidentil, 6 bulanan,
  tahunan, dan tidak berubah. Pengingat tidak mengunci pembaruan sebelum jatuh tempo.
- **Pembaruan spasial bangunan** — operator menggambar polygon atap pada peta
  OpenStreetMap/Esri/citra drone DDP; centroid dihitung server. Bangunan berpenghuni,
  kepala keluarga, dan seluruh anggotanya masuk staging sebagai satu grup atomik.
  Bangunan nonhunian memakai klasifikasi Definisi Operasional DDP.
- **Audit pembaruan** — staging dan snapshot menyimpan nama, email, serta waktu operator.
  Snapshot juga membekukan data bangunan dan ringkasan perubahan per periode.
- **Multi-tenant** — setiap `Desa` adalah tenant. Semua data (`Penduduk`, `Snapshot`,
  `StagingChange`, `SuratTemplate`, `SuratTerbit`, `PengaturanDesa`) di-scope `desaId`.
  Scope diambil dari `desaId` user yang login (otoritatif), subdomain untuk routing.
- **RBAC** — `operator` bisa input/ubah/gabungkan/terbitkan surat; `pemerintah_desa`
  read-only (dashboard + validasi). Diberlakukan di API dan disembunyikan di UI.
- **Layanan Surat** — pilih penduduk → template (Domisili/SKTM/Usaha/SKCK) → terbitkan
  (penomoran otomatis) + cetak. Kop/kepala desa/penutup diatur di **Pengaturan**.

## Instalasi & menjalankan (lokal, PostgreSQL)

Proyek ini memakai PostgreSQL (Neon/Supabase) di lokal maupun produksi.

```bash
npm install
cp .env.example .env
# isi DATABASE_URL dan DATABASE_URL_UNPOOLED dengan connection string Postgres
# ganti AUTH_SECRET:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx prisma migrate deploy   # terapkan migrasi ke database
npm run db:seed             # pastikan 4 desa demo + user + data tersedia
npm run dev                 # http://localhost:3000
```

> Ingin SQLite lokal tanpa Postgres? Set `DB_PROVIDER=sqlite` + `DATABASE_URL="file:./dev.db"`,
> jalankan `DB_PROVIDER=sqlite node scripts/build-prisma-schema.js`, lalu `npx prisma migrate dev`.
> (Jangan commit perubahan provider itu.)

> Catatan Windows: `dev`/`build` memakai flag `--webpack` (Turbopack crash saat
> memproses `globals.css` di lingkungan ini). Jangan hapus flag itu.

### Akun demo (hasil seed)

| Email | Password | Desa | Peran |
|---|---|---|---|
| `admin@ddp.local` | `Admin12345!` | Desa Setu | operator |
| `operator.setu@desapresisi.local` | `operator123` | Desa Setu | operator |
| `pemdes.setu@desapresisi.local` | `pemdes123` | Desa Setu | pemerintah_desa (lihat) |
| `operator.gunungputri@desapresisi.local` | `operator123` | Desa Gunung Putri | operator |
| `pemdes.gunungputri@desapresisi.local` | `pemdes123` | Desa Gunung Putri | pemerintah_desa (lihat) |
| `operator.citaringgul@desapresisi.local` | `operator123` | Desa Citaringgul | operator |
| `pemdes.citaringgul@desapresisi.local` | `pemdes123` | Desa Citaringgul | pemerintah_desa (lihat) |
| `operator.babakansadeng@desapresisi.local` | `operator123` | Desa Babakan Sadeng | operator |
| `pemdes.babakansadeng@desapresisi.local` | `pemdes123` | Desa Babakan Sadeng | pemerintah_desa (lihat) |

Login operator vs pemerintah_desa untuk melihat perbedaan hak akses (tombol
tambah/ubah/hapus/gabungkan/terbitkan hilang untuk pemerintah_desa).

### (Opsional) Subdomain multi-tenant di lokal

Tambahkan ke `C:\Windows\System32\drivers\etc\hosts` (butuh admin):

```
127.0.0.1  desapresisi.local
127.0.0.1  desa-setu.desapresisi.local
127.0.0.1  desa-gunung-putri.desapresisi.local
127.0.0.1  desa-citaringgul.desapresisi.local
127.0.0.1  desa-babakan-sadeng.desapresisi.local
```

- `http://desapresisi.local:3000` → landing page (domain utama).
- `http://desa-setu.desapresisi.local:3000` → dashboard tenant.

Tanpa hosts, `http://localhost:3000` tetap berjalan penuh sebagai aplikasi dashboard.

## Deploy ke Vercel (gratis) — langkah demi langkah

Schema sudah di-set ke **PostgreSQL** dan migration Postgres tersedia di
`prisma/migrations`. Build command (`package.json`) menjalankan
`prisma migrate deploy` (buat tabel) → `prisma db seed` (isi data, idempoten
sehingga hanya sekali) → `next build`. Jadi cukup:

**1. Siapkan Postgres gratis** — [Neon](https://neon.tech) atau Vercel **Storage → Postgres**;
salin *connection string* (`postgresql://...?sslmode=require`).

**2. Add New Project di Vercel** → Import repo `ikhlaslml/DDP-Updating` (branch `main`).

**3. Environment Variables** (set ke *Production* + *Preview*):

| Nama | Nilai |
|---|---|
| `DATABASE_URL` | connection string Postgres pooled untuk runtime |
| `DATABASE_URL_UNPOOLED` | connection string langsung untuk migrasi Prisma; boleh sama dengan `DATABASE_URL` bila bukan PgBouncer |
| `DB_PROVIDER` | `postgresql` |
| `AUTH_SECRET` | 32-byte hex acak (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `AUTH_TRUST_HOST` | `true` |

**4. Deploy.** Deploy pertama otomatis migrasi + seed (4 desa, user, data). Buka URL
`*.vercel.app`, login dengan akun demo di atas.

**5. (Opsional) Custom domain & subdomain** — tambah `desapresisi.id` + wildcard
`*.desapresisi.id` di Vercel untuk subdomain per desa.

## Struktur penting

- `config/indikator-mapping.json` — pemetaan 286 kolom ke 6 kelompok indikator + tipe.
- `scripts/build-indikator-mapping.js` / `build-prisma-schema.js` — generator schema.
- `prisma/seed.ts` — seed 4 desa (users, pengaturan, template, data, snapshot T0).
- `src/lib/tenant.ts` — helper scope tenant + RBAC.
- `src/lib/updating.ts` — snapshot & merge (T0/T1).
- `src/proxy.ts` — routing subdomain + proteksi auth.

## Keamanan

- Jangan commit `.env` (sudah di `.gitignore`). Ganti `AUTH_SECRET` & password default
  sebelum produksi. Akun demo di atas hanya untuk pengembangan/prototipe.
