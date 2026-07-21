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

export const KELOMPOK_LABEL = mapping._meta.kelompok;

export function kolomByKelompok(): Record<string, [string, KolomDef][]> {
  const result: Record<string, [string, KolomDef][]> = {};
  for (const key of KELOMPOK_ORDER) result[key] = [];
  for (const [name, def] of Object.entries(mapping.kolom)) {
    result[def.kelompok]?.push([name, def]);
  }
  return result;
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
