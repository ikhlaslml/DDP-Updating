# Audit Borang Harga.xlsx

## Struktur yang dibaca

- SHA-256: `2D7950E44236AC6751A132834912EB154C53BF4D3B5C61427E0CCD81220D974D`
- Satu sheet: `Sheet1`, rentang terpakai `A2:D47`.
- Header: `No`, `Nama Pangan`, `Satuan`, `Harga Per Satuan (Rp)`.
- 45 komoditas; seluruh sel harga masih kosong.
- Tidak ada kolom kategori, periode, sumber, atau desa; tidak ada formula, validasi, filter, maupun Excel Table.

Karena workbook tidak memiliki kategori, implementasi hanya memakai kategori **Pangan**. Tenant, periode, sumber, pengisi, dan timestamp menjadi metadata aplikasi; subkategori tidak ditebak.

## Daftar komoditas dan satuan

1. Beras Liter — Liter
2. Biskuit — Bungkus
3. Jagung — Kg
4. Kentang — kg
5. Mie Bungkus — Kg
6. Roti Tawar — Bungkus
7. Singkong — Kg
8. Sukun — Kg
9. Tape Beras Ketan — Liter
10. Daging Sapi — Kg
11. Daging Ayam — Kg
12. Ikan Segar — Kg
13. Ikan Kering/Asin — Kg
14. Telur Ayam — Kg
15. Kacang Hijau — Kg
16. Kajang Merah — Kg
17. Kacang Kedelai — Kg
18. Kacang Mete — Kg
19. Tahu — Bungkus
20. Tempe — Bungkus
21. Bayam — Ikat
22. Kangkung — Ikat
23. Sawi — Ikat
24. Terong — Kg
25. Oyong — Kg
26. Daun Singkong — Ikat
27. Daun Ubi — Ikat
28. Jeruk — Kg
29. Mangga — Kg
30. Pepaya — Kg
31. Pisang — Kg
32. Alpukat — Kg
33. Semangka — Kg
34. Melon — Kg
35. Cabai — Kg
36. Bawang Merah — Kg
37. Bawang Putih — Kg
38. Minyak Goreng — Liter
39. Gas — Kg
40. Garam — Kg
41. Gula — Kg
42. Susu Bungkus — Kg
43. Teh — Bungkus
44. Kopi — Bungkus
45. Rokok — Bungkus

## Perbedaan yang perlu diketahui

Mapping konsumsi aplikasi memiliki 47 item. `Daging Babi` dan `Daun Kelor` tidak ada dalam Borang. Satuan Borang berbeda dari satuan konsumsi untuk Biskuit, Mie, Garam, Susu, Teh, dan Kopi. Ada dugaan salah ketik `Kajang Merah`, serta ejaan `Mete`/`Mede`.

Perbedaan satuan tidak otomatis diperbaiki karena satuan harga dapat memang berbeda dari satuan konsumsi bulanan. Katalog harga mempertahankan teks workbook dan kode stabil; perbaikan label/satuan dilakukan kemudian sebagai perubahan master yang dapat diaudit.

Impor menerima struktur A–D yang sama. Periode dan sumber dipilih di UI sebelum impor. Ekspor menghasilkan kembali `Sheet1` dengan empat kolom tersebut dan harga untuk desa/periode yang sedang dipilih.
