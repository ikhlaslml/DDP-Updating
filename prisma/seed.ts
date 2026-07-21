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

// NIK/NKK are always exactly 16 digits: 6-digit wilayah code + 6/6 digits + 4-digit sequence.
const KODE_WILAYAH = "337301";

function makeNik(tglLahir: Date, jk: string, seq: number) {
  const dd = tglLahir.getDate() + (jk === "P" ? 40 : 0);
  const mm = tglLahir.getMonth() + 1;
  const yy = tglLahir.getFullYear() % 100;
  const nik = `${KODE_WILAYAH}${String(dd).padStart(2, "0")}${String(mm).padStart(2, "0")}${String(yy).padStart(2, "0")}${String(seq).padStart(4, "0")}`;
  if (nik.length !== 16) throw new Error(`Generated NIK is not 16 digits: ${nik}`);
  return nik;
}

function makeNkk(familyIndex: number) {
  const nkk = `${KODE_WILAYAH}${digits(6)}${String(familyIndex).padStart(4, "0")}`;
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
      return Math.random() < 0.5;
    case "int":
      if (col.endsWith("_jml") || col === "penyakit_jumlah") return randInt(0, 3);
      return randInt(0, 10);
    case "float":
      if (col.startsWith("rp_")) return randInt(0, 400) * 10000;
      if (col.startsWith("kon_")) return randInt(0, 7);
      if (col.includes("luas")) return Math.round(randInt(10, 5000) / 10) / 1 ;
      return Math.round(Math.random() * 100 * 10) / 10;
    case "date":
      return faker.date.past({ years: 3 });
    case "string":
    default:
      return faker.helpers.arrayElement(["Ya", "Tidak", "Lainnya"]);
  }
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@ddp.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin12345!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: "Admin Desa", password: passwordHash },
  });
  console.log(`Seed admin user ready: ${adminEmail} / (password from SEED_ADMIN_PASSWORD env or default)`);

  console.log("Clearing existing Penduduk records...");
  await prisma.penduduk.deleteMany();

  const columns = Object.entries(mapping.kolom) as [string, ColDef][];
  const HANDLED = new Set([
    "abs_id", "subjek", "datamasuk", "enumerator", "kode_bangunan", "kode_deskel",
    "deskel", "dusun", "rw", "rt", "lat", "lng", "responden", "nkk", "nama", "nik",
    "alamat", "status_dalam_keluarga", "status_kawin", "punya_ktp", "punya_aktalahir",
    "nama_kepala_rumah", "nama_tulang_punggung", "no_hp", "jml_keluarga", "tgl_lahir",
    "jk", "agama", "suku", "kerja_profesi", "ijazah", "tgl_kawin", "usia",
    "miskin_bps", "miskin_ekstrem", "skor_kls",
  ]);

  let nikSeq = 1;
  let familyIndex = 0;
  const records: Record<string, unknown>[] = [];
  const TARGET = 220;

  while (records.length < TARGET) {
    familyIndex++;
    const dusun = faker.helpers.arrayElement(DUSUN);
    const [baseLat, baseLng] = BASE_COORD[dusun];
    const rw = String(randInt(1, 4)).padStart(3, "0");
    const rt = String(randInt(1, 6)).padStart(3, "0");
    const kodeDeskel = "3373010001";
    const kodeBangunan = `${kodeDeskel}${String(familyIndex).padStart(4, "0")}`;
    const nkk = makeNkk(familyIndex);
    const familySurname = faker.person.lastName();
    const kepalaNama = `${faker.person.firstName()} ${familySurname}`;
    const jmlKeluarga = randInt(2, 6);
    const lat = baseLat + (Math.random() - 0.5) * 0.01;
    const lng = baseLng + (Math.random() - 0.5) * 0.01;
    const isMiskin = Math.random() < 0.22;
    const skorKls = isMiskin ? randInt(1, 40) : randInt(41, 100);

    const members = Math.min(jmlKeluarga, TARGET - records.length);
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
      const nik = makeNik(tglLahir, jk, nikSeq++);
      const agama = pickWeighted(AGAMA, AGAMA_WEIGHTS);
      const suku = faker.helpers.arrayElement(SUKU);
      const kerjaProfesi = usia < 15 ? "Pelajar/Mahasiswa" : faker.helpers.arrayElement(PROFESI);
      const ijazah =
        usia < 6
          ? "Tidak/Belum Sekolah"
          : usia < 12
          ? "SD"
          : usia < 15
          ? "SMP"
          : faker.helpers.arrayElement(IJAZAH.slice(1));

      const record: Record<string, unknown> = {
        abs_id: `ABS${String(records.length + 1).padStart(6, "0")}`,
        subjek: "Individu",
        datamasuk: faker.date.recent({ days: 400 }),
        enumerator: faker.person.fullName(),
        kode_bangunan: kodeBangunan,
        kode_deskel: kodeDeskel,
        deskel: "Desa Makmur Sejahtera",
        dusun,
        rw,
        rt,
        lat,
        lng,
        responden: isKepala,
        nkk,
        nama,
        nik,
        alamat: `${faker.location.streetAddress()}, ${dusun}`,
        status_dalam_keluarga: statusDalamKeluarga,
        status_kawin: statusKawin,
        punya_ktp: usia >= 17,
        punya_aktalahir: Math.random() < 0.92,
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
        miskin_bps: isMiskin,
        miskin_ekstrem: isMiskin && Math.random() < 0.3,
        skor_kls: skorKls,
      };

      for (const [col, def] of columns) {
        if (HANDLED.has(col)) continue;
        record[col] = genericValueFor(col, def);
      }

      records.push(record);
    }
  }

  console.log(`Inserting ${records.length} Penduduk records...`);
  const BATCH = 25;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    await prisma.$transaction(batch.map((r) => prisma.penduduk.create({ data: r as never })));
    process.stdout.write(`  ${Math.min(i + BATCH, records.length)}/${records.length}\r`);
  }
  console.log(`\nDone. Seeded ${records.length} Penduduk records across ${familyIndex} keluarga.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
