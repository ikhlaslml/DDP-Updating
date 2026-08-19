import raw from "../../config/updating-metadata.json";

export type UpdateFrequency = "INCIDENTAL" | "SIX_MONTHS" | "ANNUAL" | "IMMUTABLE";
export type ParameterRole = "HEAD" | "MEMBER" | "ALL";

type Variant = {
  options?: string[];
  inputType?: string | null;
  help?: string;
  condition?: { field: string; values: unknown[] };
};

type FieldMetadata = {
  frequency: UpdateFrequency | null;
  frequencySource: string | null;
  frequencyConfidence: number;
  variants: Partial<Record<ParameterRole, Variant>>;
};

const metadata = raw as {
  fields: Record<string, FieldMetadata>;
  events: Record<string, { label: string; frequency: UpdateFrequency; options: string[] }>;
};

export const FREQUENCY_LABELS: Record<UpdateFrequency, string> = {
  INCIDENTAL: "Insidentil",
  SIX_MONTHS: "6 bulan",
  ANNUAL: "1 tahun",
  IMMUTABLE: "Tidak berubah",
};

export function parameterMetadata(field: string) {
  return metadata.fields[field];
}

export function parameterVariant(field: string, role?: ParameterRole) {
  const variants = metadata.fields[field]?.variants ?? {};
  return (role ? variants[role] : undefined) ?? variants.ALL ?? variants.HEAD ?? variants.MEMBER;
}

export function parameterOptions(field: string, role?: ParameterRole) {
  return parameterVariant(field, role)?.options ?? [];
}

export function allParameterOptions(field: string) {
  const variants = metadata.fields[field]?.variants ?? {};
  return [...new Set(Object.values(variants).flatMap((variant) => variant?.options ?? []))];
}

export function parameterAcceptsMultiple(field: string) {
  const variants = metadata.fields[field]?.variants ?? {};
  return Object.values(variants).some((variant) => variant?.inputType === "multiselect");
}

export function parameterHelp(field: string, role?: ParameterRole) {
  return parameterVariant(field, role)?.help;
}

export function parameterInputType(field: string, role?: ParameterRole) {
  return parameterVariant(field, role)?.inputType;
}

export function parameterCondition(field: string, role?: ParameterRole) {
  return parameterVariant(field, role)?.condition;
}

export function parameterFrequency(field: string) {
  return metadata.fields[field]?.frequency ?? null;
}

export function isDue(frequency: UpdateFrequency | null, lastUpdated: Date, now = new Date()) {
  if (!frequency || frequency === "INCIDENTAL" || frequency === "IMMUTABLE") return false;
  const dueAt = new Date(lastUpdated);
  dueAt.setMonth(dueAt.getMonth() + (frequency === "SIX_MONTHS" ? 6 : 12));
  return dueAt.getTime() <= now.getTime();
}

export const eventMetadata = metadata.events;
