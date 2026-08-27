CREATE TABLE "Komoditas" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "satuan" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Komoditas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HargaKomoditas" (
    "id" TEXT NOT NULL,
    "desaId" TEXT NOT NULL,
    "komoditasId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "harga" DECIMAL(18,2) NOT NULL,
    "sumberData" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT,
    "updatedBy" TEXT NOT NULL,
    "updatedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HargaKomoditas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HargaKomoditas_harga_check" CHECK ("harga" >= 0),
    CONSTRAINT "HargaKomoditas_periode_check" CHECK ("periode" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

CREATE UNIQUE INDEX "Komoditas_kode_key" ON "Komoditas"("kode");
CREATE INDEX "Komoditas_kategori_urutan_idx" ON "Komoditas"("kategori", "urutan");
CREATE UNIQUE INDEX "HargaKomoditas_desaId_komoditasId_periode_key" ON "HargaKomoditas"("desaId", "komoditasId", "periode");
CREATE INDEX "HargaKomoditas_desaId_periode_idx" ON "HargaKomoditas"("desaId", "periode");
CREATE INDEX "HargaKomoditas_komoditasId_idx" ON "HargaKomoditas"("komoditasId");

ALTER TABLE "HargaKomoditas"
ADD CONSTRAINT "HargaKomoditas_desaId_fkey"
FOREIGN KEY ("desaId") REFERENCES "Desa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HargaKomoditas"
ADD CONSTRAINT "HargaKomoditas_komoditasId_fkey"
FOREIGN KEY ("komoditasId") REFERENCES "Komoditas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Komoditas" ("id", "kode", "kategori", "nama", "satuan", "urutan", "aktif", "createdAt", "updatedAt") VALUES
('kom-pangan-001', 'pangan-001', 'Pangan', 'Beras Liter', 'Liter', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-002', 'pangan-002', 'Pangan', 'Biskuit', 'Bungkus', 2, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-003', 'pangan-003', 'Pangan', 'Jagung', 'Kg', 3, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-004', 'pangan-004', 'Pangan', 'Kentang', 'kg', 4, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-005', 'pangan-005', 'Pangan', 'Mie Bungkus', 'Kg', 5, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-006', 'pangan-006', 'Pangan', 'Roti Tawar', 'Bungkus', 6, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-007', 'pangan-007', 'Pangan', 'Singkong', 'Kg', 7, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-008', 'pangan-008', 'Pangan', 'Sukun', 'Kg', 8, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-009', 'pangan-009', 'Pangan', 'Tape Beras Ketan', 'Liter', 9, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-010', 'pangan-010', 'Pangan', 'Daging Sapi', 'Kg', 10, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-011', 'pangan-011', 'Pangan', 'Daging Ayam', 'Kg', 11, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-012', 'pangan-012', 'Pangan', 'Ikan Segar', 'Kg', 12, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-013', 'pangan-013', 'Pangan', 'Ikan Kering/Asin', 'Kg', 13, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-014', 'pangan-014', 'Pangan', 'Telur Ayam', 'Kg', 14, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-015', 'pangan-015', 'Pangan', 'Kacang Hijau', 'Kg', 15, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-016', 'pangan-016', 'Pangan', 'Kajang Merah', 'Kg', 16, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-017', 'pangan-017', 'Pangan', 'Kacang Kedelai', 'Kg', 17, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-018', 'pangan-018', 'Pangan', 'Kacang Mete', 'Kg', 18, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-019', 'pangan-019', 'Pangan', 'Tahu', 'Bungkus', 19, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-020', 'pangan-020', 'Pangan', 'Tempe', 'Bungkus', 20, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-021', 'pangan-021', 'Pangan', 'Bayam', 'Ikat', 21, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-022', 'pangan-022', 'Pangan', 'Kangkung', 'Ikat', 22, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-023', 'pangan-023', 'Pangan', 'Sawi', 'Ikat', 23, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-024', 'pangan-024', 'Pangan', 'Terong', 'Kg', 24, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-025', 'pangan-025', 'Pangan', 'Oyong', 'Kg', 25, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-026', 'pangan-026', 'Pangan', 'Daun Singkong', 'Ikat', 26, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-027', 'pangan-027', 'Pangan', 'Daun Ubi', 'Ikat', 27, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-028', 'pangan-028', 'Pangan', 'Jeruk', 'Kg', 28, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-029', 'pangan-029', 'Pangan', 'Mangga', 'Kg', 29, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-030', 'pangan-030', 'Pangan', 'Pepaya', 'Kg', 30, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-031', 'pangan-031', 'Pangan', 'Pisang', 'Kg', 31, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-032', 'pangan-032', 'Pangan', 'Alpukat', 'Kg', 32, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-033', 'pangan-033', 'Pangan', 'Semangka', 'Kg', 33, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-034', 'pangan-034', 'Pangan', 'Melon', 'Kg', 34, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-035', 'pangan-035', 'Pangan', 'Cabai', 'Kg', 35, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-036', 'pangan-036', 'Pangan', 'Bawang Merah', 'Kg', 36, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-037', 'pangan-037', 'Pangan', 'Bawang Putih', 'Kg', 37, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-038', 'pangan-038', 'Pangan', 'Minyak Goreng', 'Liter', 38, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-039', 'pangan-039', 'Pangan', 'Gas', 'Kg', 39, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-040', 'pangan-040', 'Pangan', 'Garam', 'Kg', 40, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-041', 'pangan-041', 'Pangan', 'Gula', 'Kg', 41, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-042', 'pangan-042', 'Pangan', 'Susu Bungkus', 'Kg', 42, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-043', 'pangan-043', 'Pangan', 'Teh', 'Bungkus', 43, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-044', 'pangan-044', 'Pangan', 'Kopi', 'Bungkus', 44, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kom-pangan-045', 'pangan-045', 'Pangan', 'Rokok', 'Bungkus', 45, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
