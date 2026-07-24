import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

type ColDef = {
  kelompok: string;
  label: string;
  tipe: "string" | "int" | "float" | "date" | "boolean";
  enum?: string[];
};

const mappingPath = path.join(__dirname, "..", "config", "indikator-mapping.json");
const mapping: { kolom: Record<string, ColDef> } = JSON.parse(fs.readFileSync(mappingPath, "utf8"));

const DUSUN = ["Dusun Krajan", "Dusun Sumber", "Dusun Karangasem", "Dusun Wonorejo", "Dusun Tegalsari"];
const BASE_COORD: Record<string, [number, number]> = {
  "Dusun Krajan": [-7.6012, 110.2012],
  "Dusun Sumber": [-7.6105, 110.2151],
  "Dusun Karangasem": [-7.5931, 110.2244],
  "Dusun Wonorejo": [-7.6187, 110.1988],
  "Dusun Tegalsari": [-7.5978, 110.2333],
};
const AGAMA = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Khonghucu"];
const AGAMA_WEIGHTS = [0.82, 0.08, 0.06, 0.02, 0.015, 0.005];
const SUKU = ["Jawa", "Sunda", "Batak", "Madura", "Bugis", "Betawi", "Minang"];
const PROFESI = [
  "Petani", "Buruh Tani", "Nelayan", "Pedagang", "PNS", "Wiraswasta",
  "Buruh Harian Lepas", "Sopir", "Tukang Kayu", "Guru", "Perawat",
  "Pelajar/Mahasiswa", "Ibu Rumah Tangga", "Tidak Bekerja", "Pensiunan",
];
const IJAZAH = ["Tidak/Belum Sekolah", "SD", "SMP", "SMA", "D1/D2/D3", "S1", "S2", "S3"];
const STATUS_DALAM_KELUARGA = ["Kepala Keluarga", "Istri", "Anak", "Menantu", "Cucu", "Orang Tua", "Famili Lain"];

function pickWeighted<T>(items: T[], weights: number[]): T {
  const r = Math.random() * weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += weights[i];
    if (r <= acc) return items[i];
  }
  return items[items.length - 1];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function digits(n: number) {
  let s = "";
  for (let i = 0; i < n; i++) s += randInt(0, 9);
  return s;
}

let nikSeq = 1;
let familyCounter = 0;

function makeNik(tglLahir: Date, jk: string, seq: number, kodeWilayah: string) {
  const dd = tglLahir.getDate() + (jk === "P" ? 40 : 0);
  const mm = tglLahir.getMonth() + 1;
  const yy = tglLahir.getFullYear() % 100;
  const nik = `${kodeWilayah}${String(dd).padStart(2, "0")}${String(mm).padStart(2, "0")}${String(yy).padStart(2, "0")}${String(seq).padStart(4, "0")}`;
  if (nik.length !== 16) throw new Error(`Generated NIK is not 16 digits: ${nik}`);
  return nik;
}

function makeNkk(familyIndex: number, kodeWilayah: string) {
  const nkk = `${kodeWilayah}${digits(6)}${String(familyIndex).padStart(4, "0")}`;
  if (nkk.length !== 16) throw new Error(`Generated NKK is not 16 digits: ${nkk}`);
  return nkk;
}

function randomDateBetweenAges(minAge: number, maxAge: number) {
  const now = new Date(2026, 6, 21);
  const age = randInt(minAge, maxAge);
  const year = now.getFullYear() - age;
  const month = randInt(0, 11);
  const day = randInt(1, 28);
  return new Date(year, month, day);
}

function genericValueFor(col: string, def: ColDef): unknown {
  if (def.enum) return faker.helpers.arrayElement(def.enum);
  switch (def.tipe) {
    case "boolean":
      return Math.random() < 0.5 ? "Ya" : "Tidak";
    case "int":
      if (col.endsWith("_jml") || col === "penyakit_jumlah" || col.startsWith("ternak_")) return randInt(0, 3);
      return randInt(0, 10);
    case "float":
      if (col.startsWith("rp_")) return randInt(0, 400) * 10000;
      if (col.startsWith("kon_")) return randInt(0, 7);
      if (col.includes("luas")) return Math.round(randInt(10, 5000) / 10);
      return Math.round(Math.random() * 100 * 10) / 10;
    case "date":
      return faker.date.past({ years: 3 });
    case "string":
    default:
      return faker.helpers.arrayElement(["Ya", "Tidak", "Lainnya"]);
  }
}

const HANDLED = new Set([
  "abs_id", "subjek", "datamasuk", "enumerator", "kode_bangunan", "kode_deskel",
  "deskel", "dusun", "rw", "rt", "lat", "lng", "responden", "nkk", "nama", "nik",
  "alamat", "status_dalam_keluarga", "status_kawin", "punya_ktp", "punya_aktalahir",
  "nama_kepala_rumah", "nama_tulang_punggung", "no_hp", "jml_keluarga", "tgl_lahir",
  "jk", "agama", "suku", "kerja_profesi", "ijazah", "tgl_kawin", "usia",
  "usia_dec", "miskin_bps", "miskin_ekstrem", "miskin_bpsd", "skor_kls",
]);

const columns = Object.entries(mapping.kolom) as [string, ColDef][];

async function seedPenduduk(desaId: string, slug: string, deskel: string, kodeWil6: string, kodeDeskel: string, target: number) {
  const records: Record<string, unknown>[] = [];
  while (records.length < target) {
    familyCounter++;
    const dusun = faker.helpers.arrayElement(DUSUN);
    const [baseLat, baseLng] = BASE_COORD[dusun];
    const rw = randInt(1, 4);
    const rt = randInt(1, 6);
    const kodeBangunan = 100000 + familyCounter;
    const nkk = makeNkk(familyCounter, kodeWil6);
    const familySurname = faker.person.lastName();
    const kepalaNama = `${faker.person.firstName()} ${familySurname}`;
    const jmlKeluarga = randInt(2, 6);
    const lat = baseLat + (Math.random() - 0.5) * 0.01;
    const lng = baseLng + (Math.random() - 0.5) * 0.01;
    const isMiskin = Math.random() < 0.22;
    const skorKls = isMiskin ? randInt(1, 40) : randInt(41, 100);

    const members = Math.min(jmlKeluarga, target - records.length);
    for (let m = 0; m < members; m++) {
      const isKepala = m === 0;
      const jk = isKepala ? "L" : faker.helpers.arrayElement(["L", "P"]);
      const statusDalamKeluarga = isKepala
        ? "Kepala Keluarga"
        : m === 1
        ? faker.helpers.arrayElement(["Istri", "Suami"])
        : faker.helpers.arrayElement(STATUS_DALAM_KELUARGA.slice(2));
      const age = isKepala ? randInt(30, 65) : statusDalamKeluarga === "Istri" ? randInt(25, 60) : randInt(0, 30);
      const tglLahir = randomDateBetweenAges(age, age);
      const usia = new Date(2026, 6, 21).getFullYear() - tglLahir.getFullYear();
      const nama = isKepala ? kepalaNama : `${faker.person.firstName(jk === "L" ? "male" : "female")} ${familySurname}`;
      const statusKawin = usia < 17 ? "Belum Kawin" : faker.helpers.arrayElement(["Belum Kawin", "Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"]);
      const nik = makeNik(tglLahir, jk, nikSeq++, kodeWil6);
      const agama = pickWeighted(AGAMA, AGAMA_WEIGHTS);
      const suku = faker.helpers.arrayElement(SUKU);
      const kerjaProfesi = usia < 15 ? "Pelajar/Mahasiswa" : faker.helpers.arrayElement(PROFESI);
      const ijazah =
        usia < 6 ? "Tidak/Belum Sekolah" : usia < 12 ? "SD" : usia < 15 ? "SMP" : faker.helpers.arrayElement(IJAZAH.slice(1));

      const record: Record<string, unknown> = {
        desaId,
        abs_id: `ABS-${slug}-${String(records.length + 1).padStart(6, "0")}`,
        subjek: "Individu",
        datamasuk: faker.date.recent({ days: 400 }),
        enumerator: faker.person.fullName(),
        kode_bangunan: kodeBangunan,
        kode_deskel: kodeDeskel,
        deskel,
        dusun,
        rw,
        rt,
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
        responden: isKepala ? "Ya" : "Tidak",
        nkk,
        nama,
        nik,
        alamat: `${faker.location.streetAddress()}, ${dusun}`,
        status_dalam_keluarga: statusDalamKeluarga,
        status_kawin: statusKawin,
        punya_ktp: usia >= 17 ? "Ya" : "Tidak",
        punya_aktalahir: Math.random() < 0.92 ? "Ya" : "Tidak",
        nama_kepala_rumah: kepalaNama,
        nama_tulang_punggung: kepalaNama,
        no_hp: isKepala ? faker.phone.number({ style: "national" }) : Math.random() < 0.6 ? faker.phone.number({ style: "national" }) : null,
        jml_keluarga: jmlKeluarga,
        tgl_lahir: tglLahir,
        jk,
        agama,
        suku,
        kerja_profesi: kerjaProfesi,
        ijazah,
        tgl_kawin: statusKawin === "Kawin" ? randomDateBetweenAges(usia - randInt(1, 5), usia - randInt(1, 5)) : null,
        usia,
        usia_dec: Math.round((usia + Math.random()) * 100) / 100,
        miskin_bps: isMiskin ? "Ya" : "Tidak",
        miskin_ekstrem: isMiskin && Math.random() < 0.3 ? "Ya" : "Tidak",
        miskin_bpsd: isMiskin ? "Ya" : "Tidak",
        skor_kls: skorKls,
      };

      for (const [col, def] of columns) {
        if (HANDLED.has(col)) continue;
        record[col] = genericValueFor(col, def);
      }
      records.push(record);
    }
  }

  const BATCH = 25;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    await prisma.$transaction(batch.map((r) => prisma.penduduk.create({ data: r as never })));
  }

  // Freeze baseline as snapshot T0 for this desa.
  const baseline = await prisma.penduduk.findMany({ where: { desaId } });
  const t0 = await prisma.snapshot.create({
    data: { desaId, kode: "T0", urutan: 0, label: "Baseline Awal", jumlah: baseline.length },
  });
  for (let i = 0; i < baseline.length; i += 50) {
    const batch = baseline.slice(i, i + 50);
    await prisma.snapshotPenduduk.createMany({
      data: batch.map((r) => ({
        snapshotId: t0.id,
        nik: r.nik,
        nkk: r.nkk,
        nama: r.nama,
        dusun: r.dusun,
        data: JSON.stringify(r),
      })),
    });
  }
  console.log(`  ${slug}: ${records.length} penduduk + snapshot T0.`);
}

const TEMPLATES = [
  { nama: "Surat Keterangan Domisili", kode: "470", kategori: "PEM", isi: "Berdasarkan pengamatan kami, nama tersebut di atas adalah benar penduduk yang berdomisili di {{nama_desa}}. Surat keterangan ini dibuat untuk keperluan {{keperluan}}." },
  { nama: "Surat Pengantar SKCK", kode: "331", kategori: "PEM", isi: "Yang bersangkutan tersebut di atas adalah benar warga {{nama_desa}} dan bermaksud mengurus SKCK untuk keperluan {{keperluan}}." },
  { nama: "Surat Keterangan Tidak Mampu", kode: "460", kategori: "KESOS", isi: "Berdasarkan data kependudukan desa, yang bersangkutan tergolong keluarga kurang mampu. Surat ini dibuat untuk keperluan {{keperluan}}." },
  { nama: "Surat Keterangan Usaha", kode: "503", kategori: "EKbang", isi: "Yang bersangkutan adalah benar memiliki dan menjalankan usaha di wilayah {{nama_desa}}. Surat ini dibuat untuk keperluan {{keperluan}}." },
];

async function seedDesaSettings(desaId: string, nama: string, kop2: string, alamat: string) {
  await prisma.pengaturanDesa.upsert({
    where: { desaId },
    update: {},
    create: {
      desaId,
      namaKepala: "Ahmad Sudrajat, S.Sos",
      kopBaris1: "PEMERINTAH KABUPATEN BOGOR",
      kopBaris2: kop2,
      kopBaris3: nama.toUpperCase(),
      kopBaris4: alamat,
      penutup: "Demikian surat keterangan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.",
      disclaimer: "Surat ini diterbitkan dan ditandatangani secara digital dan sah tanpa memerlukan tanda tangan basah atau stempel.",
    },
  });
  await prisma.suratTemplate.deleteMany({ where: { desaId } });
  for (const t of TEMPLATES) await prisma.suratTemplate.create({ data: { ...t, desaId } });
}

async function upsertUser(email: string, name: string, password: string, desaId: string, role: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { desaId, role },
    create: { email, name, password: passwordHash, desaId, role },
  });
}

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin12345!";

  console.log("Clearing existing data...");
  await prisma.stagingChange.deleteMany();
  await prisma.snapshotPenduduk.deleteMany();
  await prisma.snapshot.deleteMany();
  await prisma.suratTerbit.deleteMany();
  await prisma.penduduk.deleteMany();

  const desaSetu = await prisma.desa.upsert({ where: { slug: "desa-setu" }, update: { nama: "Desa Setu" }, create: { slug: "desa-setu", nama: "Desa Setu" } });
  const desaCibubur = await prisma.desa.upsert({ where: { slug: "desa-cibubur" }, update: { nama: "Desa Cibubur" }, create: { slug: "desa-cibubur", nama: "Desa Cibubur" } });

  // Users (operator can edit; pemerintah_desa is read-only + approval).
  await upsertUser(process.env.SEED_ADMIN_EMAIL || "admin@ddp.local", "Admin Setu", adminPassword, desaSetu.id, "operator");
  await upsertUser("operator.setu@desapresisi.local", "Operator Setu", "operator123", desaSetu.id, "operator");
  await upsertUser("pemdes.setu@desapresisi.local", "Pemerintah Desa Setu", "pemdes123", desaSetu.id, "pemerintah_desa");
  await upsertUser("operator.cibubur@desapresisi.local", "Operator Cibubur", "operator123", desaCibubur.id, "operator");
  await upsertUser("pemdes.cibubur@desapresisi.local", "Pemerintah Desa Cibubur", "pemdes123", desaCibubur.id, "pemerintah_desa");

  await seedDesaSettings(desaSetu.id, "Desa Setu", "KECAMATAN CIBINONG", "Jl. Raya Setu No. 1, Bogor, Jawa Barat 16911");
  await seedDesaSettings(desaCibubur.id, "Desa Cibubur", "KECAMATAN CILEUNGSI", "Jl. Raya Cibubur No. 5, Bogor, Jawa Barat 16968");

  console.log("Seeding penduduk per desa...");
  await seedPenduduk(desaSetu.id, "desa-setu", "Desa Setu", "337301", "3373010001", 220);
  await seedPenduduk(desaCibubur.id, "desa-cibubur", "Desa Cibubur", "327102", "3271020002", 120);

  console.log("Done. 2 desa seeded with users, settings, templates, data, and T0 snapshots.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
