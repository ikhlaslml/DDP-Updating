import type { KolomDef } from "./indikator";

export function toExportValue(value: unknown, def: KolomDef): string {
  if (value === null || value === undefined) return "";
  if (def.tipe === "boolean") return value ? "Ya" : "Tidak";
  if (def.tipe === "date") {
    const d = new Date(value as string);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  }
  return String(value);
}

const TRUE_VALUES = new Set(["ya", "true", "1", "yes", "y"]);
const FALSE_VALUES = new Set(["tidak", "false", "0", "no", "n", ""]);

export type ImportParseResult =
  | { ok: true; value: unknown }
  | { ok: false; message: string };

export function fromImportValue(raw: string, def: KolomDef): ImportParseResult {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return { ok: true, value: undefined };

  if (def.enum) {
    const match = def.enum.find((opt) => opt.toLowerCase() === trimmed.toLowerCase());
    if (!match) return { ok: false, message: `Nilai "${trimmed}" bukan salah satu dari: ${def.enum.join(", ")}` };
    return { ok: true, value: match };
  }

  switch (def.tipe) {
    case "boolean": {
      const lower = trimmed.toLowerCase();
      if (TRUE_VALUES.has(lower)) return { ok: true, value: true };
      if (FALSE_VALUES.has(lower)) return { ok: true, value: false };
      return { ok: false, message: `Nilai boolean tidak dikenali: "${trimmed}"` };
    }
    case "int":
    case "float": {
      const n = Number(trimmed);
      if (Number.isNaN(n)) return { ok: false, message: `Bukan angka: "${trimmed}"` };
      return { ok: true, value: n };
    }
    case "date": {
      const d = new Date(trimmed);
      if (Number.isNaN(d.getTime())) return { ok: false, message: `Tanggal tidak valid: "${trimmed}"` };
      return { ok: true, value: trimmed };
    }
    default:
      return { ok: true, value: trimmed };
  }
}
