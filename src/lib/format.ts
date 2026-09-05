import type { KolomDef } from "./indikator";

export function formatCell(value: unknown, def: KolomDef | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  if (!def) return String(value);
  switch (def.tipe) {
    case "boolean":
      return value ? "Ya" : "Tidak";
    case "date": {
      const d = new Date(value as string);
      if (Number.isNaN(d.getTime())) return String(value);
      return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    }
    case "int":
      return typeof value === "number" ? String(value) : String(value);
    case "float":
      return typeof value === "number" ? value.toLocaleString("id-ID") : String(value);
    default:
      return String(value);
  }
}

export function formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export function inputValueFromRecord(value: unknown, tipe: KolomDef["tipe"]): string {
  if (value === null || value === undefined) return "";
  if (tipe === "date") {
    const d = new Date(value as string);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  }
  if (tipe === "boolean") return value ? "true" : "false";
  return String(value);
}
