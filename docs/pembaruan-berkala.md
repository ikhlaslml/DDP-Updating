# Pembaruan Berkala Berbasis Keluarga

## Model kerja

Unit kerja utama adalah keluarga (`nkk`), bukan satu penduduk penuh. Parameter
yang hanya ditanyakan kepada kepala keluarga diubah satu kali dan dibuat sebagai
`StagingChange` untuk seluruh anggota aktif pada NKK tersebut. Parameter yang
ditanyakan kepada anggota tetap disimpan per jiwa.

Perubahan nilai selalu melewati staging dan baru memutakhirkan baseline setelah
aksi **Gabungkan dan Buat Periode**. Aksi **Tidak berubah** tidak membuat
perubahan nilai; aksi ini hanya menulis patokan waktu dan audit ke
`FieldUpdate` serta `FieldUpdateLog`.

## Siklus

- `6-bulan` menggunakan metadata `SIX_MONTHS`.
- `1-tahun` menggunakan metadata `ANNUAL`.
- Identitas `nkk`, `nik`, `nama`, `dusun`, `rw`, `rt`, dan `kode_bangunan`
  hanya menjadi konteks dan tidak dapat diedit dari halaman berkala.
- `kode_deskel` dan `deskel` tidak masuk cakupan karena konstan per tenant.

## Patokan jatuh tempo

Urutan patokan untuk setiap pasangan penduduk–parameter:

1. `FieldUpdate.updatedAt`.
2. `PengaturanDesa.tanggalBaselineData` bila operator menetapkannya.
3. Snapshot terbaru yang memuat NIK penduduk.
4. Tanggal snapshot T0.
5. `Penduduk.createdAt`.

Status sel:

- `JATUH_TEMPO`: tanggal patokan ditambah 6 atau 12 bulan sudah terlewati.
- `MENUNGGU_PENGGABUNGAN`: field memiliki perubahan staging yang belum
  digabungkan. Status ini mengalahkan jatuh tempo agar operator tidak mengedit
  perubahan yang sama dua kali.
- `TERKINI`: belum jatuh tempo atau sudah dikonfirmasi/digabungkan.

Pengingat adalah prioritas kerja, bukan kunci. Perubahan insidental tetap dapat
dilakukan kapan saja melalui alur peristiwa dan profil penduduk.

## Audit

`FieldUpdate` menyimpan keadaan terakhir per field. `FieldUpdateLog` bersifat
append-only dan menyimpan `scope`, `source`, pelaku, NKK, kaitan staging, catatan,
serta waktu. Nilai `source`:

- `EDIT` untuk perubahan yang telah digabungkan.
- `CONFIRMED_NO_CHANGE` untuk konfirmasi tanpa perubahan nilai.

Peran `pemerintah_desa` hanya melihat data. Seluruh API mutasi memverifikasi
peran terkini dari basis data dan memfilter `desaId`.

## Keputusan alur insidental

Tidak dibuat “tabel layanan” baru untuk tambah atau keluarkan anggota keluarga.
`StagingChange` sudah menjadi antrean perubahan yang dapat ditinjau, sedangkan
`PeristiwaKependudukan` menjadi jurnal setelah penggabungan. Menambah tabel ketiga
akan menduplikasi status dan meningkatkan risiko perbedaan data.

`PeristiwaKependudukan` diperluas dengan kolom wilayah migrasi terstruktur agar
pelaporan tidak perlu membongkar JSON. Form kelahiran mendukung NIK bayi kosong,
identitas ibu, urutan anak, dan pembuatan NIK sementara oleh backend.

## Keputusan terbuka

Tidak ada perubahan skema untuk “Parameter DDP estimasi waktu updating” karena
baris sumber tidak memiliki definisi. Keputusan dan alasannya dicatat di
`docs/rekonsiliasi-periode-updating.md`.
