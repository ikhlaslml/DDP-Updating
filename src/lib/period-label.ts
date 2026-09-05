export type PeriodLike = {
  kode: string;
  label?: string | null;
  createdAt?: string | Date;
  urutan?: number;
  jumlah?: number;
};

function periodIndex(period: PeriodLike): number | null {
  if (typeof period.urutan === "number") return period.urutan;
  const match = /^T(\d+)$/i.exec(period.kode ?? "");
  return match ? Number(match[1]) : null;
}

function customLabel(label: string | null | undefined): string {
  if (!label) return "";
  const stripped = label
    .replace(/\bBaseline\b/gi, "")
    .replace(/\bT\d+\b/gi, "")
    .replace(/\s*[—–-]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped || /^(awal|t\d+)$/i.test(stripped)) return "";
  return stripped;
}

export function periodDisplayName(period: PeriodLike): string {
  const custom = customLabel(period.label);
  if (custom) return custom;
  const index = periodIndex(period);
  if (index === 0) return "Data awal";
  if (index !== null && index > 0) return `Pembaruan ${index}`;
  return "Pembaruan data";
}

export function periodOptionLabel(period: PeriodLike, unit = "warga"): string {
  const name = periodDisplayName(period);
  const date = period.createdAt
    ? new Date(period.createdAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
  const count =
    typeof period.jumlah === "number"
      ? `${period.jumlah.toLocaleString("id-ID")} ${unit}`
      : "";
  return [name, date, count].filter(Boolean).join(" · ");
}
