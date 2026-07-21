# Inspeksi Situs Referensi — Hasil dan Kendala

## Status: GAGAL LOGIN — tidak bisa melanjutkan inspeksi mendalam

**Tanggal percobaan:** 2026-07-21
**Alat:** Script Playwright kustom (`tools/inspect/inspect.mjs`, headless Chromium)
**URL:** https://staging-ddp-update.vercel.app/
**Email dicoba:** afanraymahardika@gmail.com
**Password dicoba:** 1234567890 (10 karakter, sesuai yang diberikan)

## Apa yang terjadi

1. Halaman berhasil dimuat. Situs aktif dan menampilkan form login sederhana:
   judul "Dashboard Desa", subjudul "Silakan login untuk melanjutkan", field
   `Email` (`input[type=email][name=email]`), field `Password`
   (`input[type=password][name=password]`), dan tombol `Login`. Lihat
   `tools/inspect/output/00-landing.png`.
2. Form diisi otomatis dengan kredensial di atas dan disubmit lewat tombol
   `Login`. Tidak ada ambiguitas elemen — hanya ada satu field email dan satu
   field password di halaman, sehingga bukan kesalahan selector.
3. Situs merespons dengan pesan error di halaman yang sama:

   > **Email/Password is not correct. Please try again.**

4. Karena login gagal, tahap crawling seluruh halaman/menu (yang butuh sesi
   ter-otentikasi) **dihentikan** sesuai instruksi — tidak ada halaman internal
   dashboard yang berhasil diinspeksi.

Detail mentah ada di `tools/inspect/output/report.json` dan screenshot di
`tools/inspect/output/00-landing.png`.

## Kemungkinan penyebab (tidak bisa dipastikan dari sisi kami)

- Password di staging sudah diganti sejak prompt ini ditulis.
- Akun ini belum pernah dibuat / sudah dihapus di database staging.
- Typo pada email atau password saat prompt disusun.
- Rate limiting / lockout sementara pada akun (pesan error tidak mengindikasikan ini secara eksplisit — pesannya spesifik "not correct", bukan "too many attempts").

## Tindak lanjut yang dilakukan

Sesuai instruksi prompt bagian 2 ("Jika login atau akses gagal, hentikan tahap
ini, laporkan kendalanya secara spesifik, dan lanjutkan pembangunan
berdasarkan spesifikasi umum dashboard kependudukan..."), pembangunan
dilanjutkan berdasarkan **spesifikasi umum dashboard kependudukan desa** yang
lazim (bukan hasil observasi langsung terhadap staging site):

- Login (email + password) → proteksi seluruh halaman dashboard → logout.
- Halaman utama: kartu ringkasan statistik (total penduduk, total KK, sebaran
  dusun) + beberapa grafik (piramida penduduk, pendidikan, pekerjaan, agama,
  kemiskinan).
- Halaman tabel data penduduk: pencarian, filter, pagination, toggle kolom,
  sorting, aksi lihat/ubah/hapus per baris, tombol tambah data.
- Form tambah/ubah data multi-bagian (per kelompok indikator) dengan stepper.
- Halaman detail record, dikelompokkan per indikator.
- Halaman peta sebaran (Leaflet) dengan marker per bangunan/koordinat.
- Import/export CSV/Excel.

## Bagian yang PERLU KONFIRMASI Anda

Karena tidak ada observasi langsung terhadap UI staging, hal-hal berikut
adalah asumsi terbaik kami dan sebaiknya dicek ulang terhadap situs asli
setelah kredensial staging diperbaiki:

- [ ] Struktur menu/navigasi persis (nama-nama menu, urutan halaman).
- [ ] Nama dan susunan kolom yang tampil default di tabel (sebelum toggle).
- [ ] Jenis grafik persis yang ada di dashboard referensi (kami menambahkan
      set grafik yang masuk akal untuk data kependudukan, bisa jadi berbeda
      dari staging).
- [ ] Field filter persis yang tersedia di tabel referensi (kami mengasumsikan
      dusun/RW/RT/jenis kelamin/status kemiskinan berdasarkan permintaan Anda
      di bagian 5 prompt).
- [ ] Alur multi-step form (jumlah langkah, urutan) di situs referensi —
      kami merancang stepper berdasarkan 6 kelompok indikator sesuai bagian 4.
- [ ] Perilaku import/export persis (format file, validasi) di situs referensi.

**Rekomendasi:** setelah Anda memverifikasi/mereset password akun staging,
jalankan ulang `node tools/inspect/inspect.mjs` (isi dulu
`tools/inspect/.env.inspect.local`, contoh ada di
`tools/inspect/.env.inspect.example`) untuk melengkapi dokumen ini dengan
observasi nyata, lalu beri tahu saya bagian mana yang perlu disesuaikan.

## Keamanan

Password yang dicoba di atas telah gagal dan tercatat di beberapa tempat
(prompt Anda, dokumen ini). Sebaiknya password staging diganti setelah
pekerjaan ini selesai, terlepas dari apakah percobaan login berhasil atau
tidak. Kredensial tidak disimpan di dalam kode aplikasi maupun dikomit ke
Git — hanya ada di `tools/inspect/.env.inspect.local`, yang sudah masuk
`.gitignore`.
