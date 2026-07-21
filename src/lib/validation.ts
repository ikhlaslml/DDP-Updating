import { z } from "zod";
import { mapping, type KolomDef } from "./indikator";

const NIK_NKK_RE = /^\d{16}$/;
// Indonesia's rough bounding box.
const LAT_RANGE: [number, number] = [-11, 6];
const LNG_RANGE: [number, number] = [95, 141];

export const REQUIRED_FIELDS = new Set([
  "nama",
  "nik",
  "nkk",
  "jk",
  "dusun",
  "rw",
  "rt",
  "tgl_lahir",
  "status_dalam_keluarga",
]);

function coreZodType(name: string, def: KolomDef): z.ZodTypeAny {
  if (name === "nik" || name === "nkk") {
    return z.string().regex(NIK_NKK_RE, "Harus berupa 16 digit angka");
  }
  if (def.enum) {
    return z.enum(def.enum as [string, ...string[]]);
  }
  switch (def.tipe) {
    case "int":
      return z.coerce.number().int("Harus bilangan bulat").min(0, "Tidak boleh negatif");
    case "float": {
      const s = z.coerce.number();
      if (name === "lat") {
        return s.min(LAT_RANGE[0], "Di luar rentang lintang Indonesia").max(LAT_RANGE[1], "Di luar rentang lintang Indonesia");
      }
      if (name === "lng") {
        return s.min(LNG_RANGE[0], "Di luar rentang bujur Indonesia").max(LNG_RANGE[1], "Di luar rentang bujur Indonesia");
      }
      return s.min(0, "Tidak boleh negatif");
    }
    case "boolean":
      return z.coerce.boolean();
    case "date":
      return z.coerce.date({ error: "Tanggal tidak valid" });
    case "string":
    default:
      return z.string().trim();
  }
}

function fieldSchema(name: string, def: KolomDef, requireIt: boolean): z.ZodTypeAny {
  const core = coreZodType(name, def);
  if (requireIt) {
    if (!def.enum && def.tipe === "string" && name !== "nik" && name !== "nkk") {
      return z.string().trim().min(1, "Wajib diisi");
    }
    return core;
  }
  return core.nullable().optional();
}

function buildSchema(mode: "create" | "update") {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [name, def] of Object.entries(mapping.kolom)) {
    if (name === "abs_id") {
      shape[name] = z.string().trim().min(1).optional();
      continue;
    }
    const requireIt = mode === "create" && REQUIRED_FIELDS.has(name);
    shape[name] = fieldSchema(name, def, requireIt);
  }
  return z.object(shape);
}

export const pendudukCreateSchema = buildSchema("create");
export const pendudukUpdateSchema = buildSchema("update");

export type PendudukCreateInput = z.infer<typeof pendudukCreateSchema>;
export type PendudukUpdateInput = z.infer<typeof pendudukUpdateSchema>;

export function flattenZodError(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
