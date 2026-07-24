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
- **Updating T0/T1** — perubahan (tambah/ubah/hapus) masuk ke `StagingChange`
  ("Data Perubahan Sementara"). Klik **Gabungkan** menerapkannya ke baseline lalu
  membekukan `Snapshot` baru (`T1`, `T2`, …) yang immutable. Lihat via **Riwayat Data**.
- **Multi-tenant** — setiap `Desa` adalah tenant. Semua data (`Penduduk`, `Snapshot`,
  `StagingChange`, `SuratTemplate`, `SuratTerbit`, `PengaturanDesa`) di-scope `desaId`.
  Scope diambil dari `desaId` user yang login (otoritatif), subdomain untuk routing.
- **RBAC** — `operator` bisa input/ubah/gabungkan/terbitkan surat; `pemerintah_desa`
  read-only (dashboard + validasi). Diberlakukan di API dan disembunyikan di UI.
- **Layanan Surat** — pilih penduduk → template (Domisili/SKTM/Usaha/SKCK) → terbitkan
  (penomoran otomatis) + cetak. Kop/kepala desa/penutup diatur di **Pengaturan**.

## Instalasi & menjalankan (lokal, SQLite)

```bash
npm install
cp .env.example .env
# ganti AUTH_SECRET:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx prisma migrate dev      # buat prisma/dev.db + jalankan seed
npm run dev                 # http://localhost:3000
```

> Catatan Windows: `dev`/`build` memakai flag `--webpack` (Turbopack crash saat
> memproses `globals.css` di lingkungan ini). Jangan hapus flag itu.

### Akun demo (hasil seed)

| Email | Password | Desa | Peran |
|---|---|---|---|
| `admin@ddp.local` | `Admin12345!` | Desa Setu | operator |
| `operator.setu@desapresisi.local` | `operator123` | Desa Setu | operator |
| `pemdes.setu@desapresisi.local` | `pemdes123` | Desa Setu | pemerintah_desa (lihat) |
| `operator.cibubur@desapresisi.local` | `operator123` | Desa Cibubur | operator |
| `pemdes.cibubur@desapresisi.local` | `pemdes123` | Desa Cibubur | pemerintah_desa (lihat) |

Login operator vs pemerintah_desa untuk melihat perbedaan hak akses (tombol
tambah/ubah/hapus/gabungkan/terbitkan hilang untuk pemerintah_desa).

### (Opsional) Subdomain multi-tenant di lokal

Tambahkan ke `C:\Windows\System32\drivers\etc\hosts` (butuh admin):

```
127.0.0.1  desapresisi.local
127.0.0.1  desa-setu.desapresisi.local
127.0.0.1  desa-cibubur.desapresisi.local
```

- `http://desapresisi.local:3000` → landing page (domain utama).
- `http://desa-setu.desapresisi.local:3000` → dashboard tenant.

Tanpa hosts, `http://localhost:3000` tetap berjalan penuh sebagai aplikasi dashboard.

## Deploy ke Vercel (gratis) — langkah demi langkah

Vercel free tidak menyimpan file (SQLite tidak persisten), jadi produksi memakai
**PostgreSQL gratis** (Neon/Supabase). Ringkasnya lihat bagian bawah README ini juga.

**1. Siapkan Postgres gratis** — buat project di [Neon](https://neon.tech) atau
[Supabase](https://supabase.com), salin *connection string* (`postgresql://...`).

**2. Generate schema + migration Postgres (lokal, sekali):**

```bash
# arahkan Prisma ke Postgres cloud
export DATABASE_URL="postgresql://...(connection string)..."
# regenerasi schema.prisma dengan provider postgresql
DB_PROVIDER=postgresql node scripts/build-prisma-schema.js
# hapus migration SQLite lama, buat migration Postgres + seed data ke cloud
rm -rf prisma/migrations
npx prisma migrate dev --name init
```

(Di PowerShell: `$env:DATABASE_URL="..."; $env:DB_PROVIDER="postgresql"; node scripts/build-prisma-schema.js; Remove-Item -Recurse -Force prisma/migrations; npx prisma migrate dev --name init`)

Commit `prisma/schema.prisma` + `prisma/migrations` yang baru.

**3. Set build command** agar migrasi berjalan saat deploy. Di `package.json`:

```json
"build": "prisma migrate deploy && next build --webpack"
```

**4. Push ke GitHub**, lalu di Vercel: **Add New Project → Import** repo ini.

**5. Environment variables di Vercel** (Settings → Environment Variables):

| Nama | Nilai |
|---|---|
| `DATABASE_URL` | connection string Postgres |
| `DB_PROVIDER` | `postgresql` |
| `AUTH_SECRET` | 32-byte hex acak |
| `AUTH_TRUST_HOST` | `true` |

**6. Deploy.** Vercel mendeteksi Next.js otomatis. Setelah live, buka URL
`*.vercel.app` dan login dengan akun demo di atas (data sudah ter-seed di langkah 2).

**7. (Opsional) Custom domain & subdomain** — untuk `desapresisi.id` + subdomain
per desa, tambahkan domain di Vercel dan set wildcard `*.desapresisi.id`.

## Struktur penting

- `config/indikator-mapping.json` — pemetaan 286 kolom ke 6 kelompok indikator + tipe.
- `scripts/build-indikator-mapping.js` / `build-prisma-schema.js` — generator schema.
- `prisma/seed.ts` — seed 2 desa (users, pengaturan, template, data, snapshot T0).
- `src/lib/tenant.ts` — helper scope tenant + RBAC.
- `src/lib/updating.ts` — snapshot & merge (T0/T1).
- `src/proxy.ts` — routing subdomain + proteksi auth.

## Keamanan

- Jangan commit `.env` (sudah di `.gitignore`). Ganti `AUTH_SECRET` & password default
  sebelum produksi. Akun demo di atas hanya untuk pengembangan/prototipe.
