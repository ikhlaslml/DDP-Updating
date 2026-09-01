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
- ExcelJS + Papa Parse (impor/ekspor), PDFKit (dokumen), zod (validasi)

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
  dengan nomor atomik, riwayat/filter, cetak ulang, dan PDF. Kop, logo, kepala desa,
  serta penutup diatur per tenant pada **Pengaturan**.
- **Pendataan lapangan** — identitas/foto responden wajib sebelum aspek pendataan,
  foto dikompresi di browser, draft bertahan saat refresh/offline, dan setiap kunjungan
  disimpan append-only. Keluarga baru berhenti pada Aspek 1 dan diberi status belum lengkap.
- **Harga komoditas** — 45 baris master mengikuti `Borang Harga.xlsx`, dapat disunting
  inline, diimpor/diekspor, dan mempunyai riwayat harga per desa/periode.
- **Filter aspek** — enam aspek DDP dapat dipilih bersamaan. NKK/NIK/nama selalu terkunci
  di kiri dan ekspor Excel/CSV mengikuti kolom aktif.

## Instalasi & menjalankan (lokal, PostgreSQL)

Proyek ini memakai PostgreSQL (Neon/Supabase) di lokal maupun produksi.

```bash
npm ci
cp .env.example .env
# isi DATABASE_URL dan DATABASE_URL_UNPOOLED dengan connection string Postgres
# ganti AUTH_SECRET:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx prisma migrate deploy   # terapkan migrasi ke database
npm run db:seed             # hanya untuk lingkungan demo/nonproduksi
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

## Deploy ke Vercel — langkah demi langkah

Schema produksi menggunakan **PostgreSQL** dan migrasi tersedia di
`prisma/migrations`. `vercel.json` menjalankan `npm run db:deploy` sebagai release gate,
kemudian build aplikasi. Seed demo **tidak pernah** dijalankan otomatis.

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
| `BLOB_READ_WRITE_TOKEN` | token Vercel Blob private untuk foto responden dan logo |
| `DDP_DATA_SOURCE` | `local` selama pilot; ubah ke `ruby` setelah kontrak API tersedia |
| `DDP_CORE_API_BASE_URL` | `https://core.desapresisi.id` untuk foto bangunan |

Jika `DDP_DATA_SOURCE=ruby`, tambahkan `DDP_API_BASE_URL`, `DDP_API_TOKEN`,
`DDP_API_RESIDENTS_PATH`, dan `DDP_API_TIMEOUT_MS`. Token hanya dibaca route server.

**4. Deploy.** Push ke branch produksi memicu migrasi idempoten lalu build. Data demo
tidak ditambah atau diubah. Pastikan backup database tersedia sebelum release pertama.

**5. (Opsional) Custom domain & subdomain** — tambah `desapresisi.id` + wildcard
`*.desapresisi.id` di Vercel untuk subdomain per desa.

### Merapikan kode bangunan demo lama

Seed baru membuat kode bangunan `1, 2, 3, ...` per desa. Seed tidak mengubah data
yang sudah ada. Untuk database demo lama yang seluruh kodenya masih `100000+`, buat
backup lalu lakukan dry-run berikut terlebih dahulu:

```powershell
npm run db:resequence:demo-buildings -- --desa desa-setu
```

Jika laporan hanya menunjukkan data dummy yang benar, terapkan secara eksplisit:

```powershell
npm run db:resequence:demo-buildings -- --desa desa-setu --apply --confirm-demo
```

Untuk empat tenant demo bawaan gunakan `--all-demo` sebagai pengganti `--desa`.
Saat apply, nilai dummy lama `refreshing` Ya/Tidak juga diselaraskan menjadi kategori
frekuensi `1x`/`tidak pernah`. Alat ini tidak untuk CSV/API DDP asli dan tidak pernah
berjalan otomatis ketika deploy.

## Struktur penting

- `config/indikator-mapping.json` — pemetaan 286 kolom ke 6 kelompok indikator + tipe.
- `scripts/build-indikator-mapping.js` / `build-prisma-schema.js` — generator schema.
- `prisma/seed.ts` — seed 4 desa (users, pengaturan, template, data, snapshot T0).
- `src/lib/tenant.ts` — helper scope tenant + RBAC.
- `src/lib/census-source.ts` — adapter baseline lokal atau API Ruby DDP.
- `src/lib/media-storage.ts` — private Vercel Blob/fallback lokal untuk media tenant.
- `src/lib/updating.ts` — snapshot & merge (T0/T1).
- `src/proxy.ts` — routing subdomain + proteksi auth.

## Keamanan

- Jangan commit `.env` (sudah di `.gitignore`). Ganti `AUTH_SECRET` & password default
  sebelum produksi. Akun demo di atas hanya untuk pengembangan/prototipe.
- Jangan unggah CSV empat desa yang berisi PII ke Git atau percakapan. Impor data nyata
  dilakukan langsung dari perangkat berwenang ke lingkungan pilot.
- URL foto bangunan Core DDP bertanda tangan tidak disimpan; server mengambil URL baru,
  memvalidasi tenant/kode wilayah, lalu mem-proxy byte gambar ke pengguna yang login.
