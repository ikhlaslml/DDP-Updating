import type { KolomDef } from "./indikator";

export function buildPayload(
  formData: Record<string, string>,
  columns: [string, KolomDef][]
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [name, def] of columns) {
    const raw = formData[name];
    if (raw === undefined || raw === "") continue;
    if (def.tipe === "boolean") {
      payload[name] = raw === "true";
    } else if (def.tipe === "int" || def.tipe === "float") {
      const n = Number(raw);
      payload[name] = Number.isNaN(n) ? raw : n;
    } else {
      payload[name] = raw;
    }
  }
  return payload;
}
