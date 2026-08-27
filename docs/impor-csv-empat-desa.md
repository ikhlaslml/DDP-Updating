# Impor aman satu CSV gabungan empat desa

CSV sumber boleh berisi empat desa/kelurahan dengan susunan 286 kolom yang sama.
Setiap baris wajib mempunyai `kode_deskel` atau `deskel`. `kode_deskel` menjadi
identitas utama; nama desa dipakai sebagai cadangan dan pemeriksaan konsistensi.

## Prinsip keamanan

- Jangan mengunggah CSV berisi NIK, NKK, nama, alamat, koordinat, atau nomor telepon
  ke GitHub, percakapan, maupun build Vercel.
- Simpan berkas di luar repository pada komputer berwenang. Pola
  `.private-import/`, `private-import/`, dan `*.private.csv` juga sudah diabaikan Git.
- Jalankan pertama kali pada database UAT kosong yang terpisah dari demo dan produksi.
- Gunakan koneksi langsung `DATABASE_URL_UNPOOLED`, backup/PITR, dan empat
  `Desa.kodeWilayah` resmi yang unik.
- Alat selalu melakukan dry-run kecuali flag `--apply` diberikan.

## Dry-run

```powershell
npm run db:import:multidesa -- --file "C:\lokasi-aman\sensus-4-desa.private.csv"
```

Dry-run memeriksa header, tipe 286 indikator, NIK/NKK, duplikasi, kode/nama desa,
jumlah desa, target database, dan checksum SHA-256. Laporan hanya menampilkan nomor
baris, nama field, serta hitungan per desa; nilai PII tidak dicetak.

Secara default harus terdeteksi tepat empat desa. Untuk latihan berkas anonim satu
desa, gunakan `--expected-villages 1`.

## Apply

Apply hanya boleh dilakukan setelah dry-run bersih, backup terverifikasi, dan database
UAT tujuan tidak berisi penduduk atau snapshot:

```powershell
npm run db:import:multidesa -- --file "C:\lokasi-aman\sensus-4-desa.private.csv" --apply
```

Seluruh desa dimasukkan dalam satu transaksi. Jika satu bagian gagal, semuanya
dibatalkan. Setelah berhasil, setiap desa memperoleh baseline `Penduduk` dan snapshot
awal `T0`. Berkas sumber tidak disalin ke repository atau Vercel Blob.

## Perbedaan dengan impor pada website

Menu **Impor / Ekspor** adalah impor harian tenant-scoped: operator hanya boleh
memasukkan data milik desa yang sedang login dan hasilnya masuk ke Perubahan Sementara.
Menu tersebut menolak CSV gabungan agar baris desa lain tidak masuk ke tenant yang salah.

CSV gabungan empat desa merupakan migrasi baseline sekali jalan dan karena itu memakai
alat admin di atas. Jangan menjalankannya pada database demo yang masih berisi data.

## Pemeriksaan setelah apply

1. Cocokkan jumlah baris per `kode_deskel` dengan laporan sumber.
2. Pastikan setiap desa mempunyai snapshot `T0` dan kode wilayah unik.
3. Login sebagai operator masing-masing desa dan uji bahwa desa lain tidak terlihat.
4. Uji daftar penduduk, peta, detail keluarga/bangunan, ekspor, dan surat.
5. Catat checksum CSV, waktu, operator pelaksana, serta hasil rekonsiliasi dalam berita acara.
