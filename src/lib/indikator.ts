import raw from "../../config/indikator-mapping.json";

export type Tipe = "string" | "int" | "float" | "date" | "boolean";

export interface KolomDef {
  kelompok: string;
  kelompok_label: string;
  label: string;
  tipe: Tipe;
  enum?: string[];
  perlu_konfirmasi: boolean;
}

export interface IndikatorMapping {
  _meta: {
    total_kolom: number;
    kelompok: Record<string, string>;
    jumlah_per_kelompok: Record<string, number>;
    target_per_kelompok: Record<string, number>;
    selisih_per_kelompok: Record<string, number>;
    perlu_konfirmasi: string[];
  };
  kolom: Record<string, KolomDef>;
}

export const mapping = raw as IndikatorMapping;

export const KELOMPOK_ORDER = [
  "identitas_keluarga",
  "pendidikan_kebudayaan",
  "infrastruktur_lingkungan",
  "sosial_hukum_ham",
  "kesehatan_kerja_jamsos",
  "sandang_pangan_papan",
] as const;

export type KelompokIndikator = (typeof KELOMPOK_ORDER)[number];
export const CORE_RESIDENT_COLUMNS = ["nkk", "nik", "nama"] as const;

export const KELOMPOK_LABEL = mapping._meta.kelompok;

export function kolomByKelompok(): Record<string, [string, KolomDef][]> {
  const result: Record<string, [string, KolomDef][]> = {};
  for (const key of KELOMPOK_ORDER) result[key] = [];
  for (const [name, def] of Object.entries(mapping.kolom)) {
    result[def.kelompok]?.push([name, def]);
  }
  return result;
}

export function parseKelompokParam(value: string | null | undefined): KelompokIndikator[] {
  if (value === null || value === undefined) return ["identitas_keluarga"];
  const requested = new Set(value.split(",").map((item) => item.trim()).filter(Boolean));
  return KELOMPOK_ORDER.filter((item) => requested.has(item));
}

export function columnsForKelompok(groups: Iterable<KelompokIndikator>) {
  const selected = new Set(groups);
  const grouped = kolomByKelompok();
  const columns = [
    ...CORE_RESIDENT_COLUMNS,
    ...KELOMPOK_ORDER.flatMap((group) => selected.has(group) ? grouped[group].map(([name]) => name) : []),
  ];
  return [...new Set(columns)];
}

export const ALL_COLUMNS = Object.keys(mapping.kolom);

export const DEFAULT_VISIBLE_COLUMNS = [
  "nama",
  "nik",
  "nkk",
  "dusun",
  "rw",
  "rt",
  "jk",
  "usia",
  "status_dalam_keluarga",
  "miskin_bps",
];
