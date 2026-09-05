import raw from "../../config/updating-metadata.json";

export type UpdateFrequency = "INCIDENTAL" | "SIX_MONTHS" | "ANNUAL" | "IMMUTABLE";
export type ParameterRole = "HEAD" | "MEMBER" | "ALL";

type Variant = {
  active?: boolean;
  options?: string[];
  inputType?: string | null;
  help?: string;
  condition?: { field: string; values: unknown[] };
};

type FieldMetadata = {
  frequency: UpdateFrequency | null;
  frequencyByRole?: Partial<Record<"HEAD" | "MEMBER", UpdateFrequency>>;
  askedTo?: ("HEAD" | "MEMBER")[];
  frequencySource: string | null;
  frequencyConfidence: number;
  datatypeStatus?: string | null;
  editable?: boolean;
  deprecated?: boolean;
  conditionOnly?: boolean;
  derived?: boolean;
  variants: Partial<Record<ParameterRole, Variant>>;
};

const metadata = raw as {
  fields: Record<string, FieldMetadata>;
  events: Record<string, { label: string; frequency: UpdateFrequency; options: string[] }>;
};

export const FREQUENCY_LABELS: Record<UpdateFrequency, string> = {
  INCIDENTAL: "Jika ada perubahan",
  SIX_MONTHS: "6 bulan",
  ANNUAL: "1 tahun",
  IMMUTABLE: "Tidak berubah",
};

export function parameterMetadata(field: string) {
  return metadata.fields[field];
}

export function parameterAskedTo(field: string) {
  return metadata.fields[field]?.askedTo ?? [];
}

export function parameterIsDeprecated(field: string) {
  return Boolean(metadata.fields[field]?.deprecated);
}

export function parameterIsConditionOnly(field: string) {
  return Boolean(metadata.fields[field]?.conditionOnly);
}

export function parameterVariant(field: string, role?: ParameterRole) {
  const variants = metadata.fields[field]?.variants ?? {};
  return (role ? variants[role] : undefined) ?? variants.ALL ?? variants.HEAD ?? variants.MEMBER;
}

export function parameterIsEditable(field: string, role?: ParameterRole) {
  const fieldMetadata = metadata.fields[field];
  if (!fieldMetadata?.editable) return false;
  const variants = fieldMetadata.variants ?? {};
  if (!role) return Object.values(variants).some((variant) => variant?.active);
  return Boolean(variants[role]?.active || variants.ALL?.active);
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

export function parameterFrequency(field: string, role?: ParameterRole) {
  const fieldMetadata = metadata.fields[field];
  if (role === "HEAD" || role === "MEMBER") {
    return fieldMetadata?.frequencyByRole?.[role] ?? null;
  }
  return fieldMetadata?.frequency ?? null;
}

export function isDue(frequency: UpdateFrequency | null, lastUpdated: Date, now = new Date()) {
  if (!frequency || frequency === "INCIDENTAL" || frequency === "IMMUTABLE") return false;
  const dueAt = new Date(lastUpdated);
  dueAt.setMonth(dueAt.getMonth() + (frequency === "SIX_MONTHS" ? 6 : 12));
  return dueAt.getTime() <= now.getTime();
}

export const eventMetadata = metadata.events;
