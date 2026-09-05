"use client";

export type MigrationRegionValue = {
  desaKelurahan: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
};

export const EMPTY_MIGRATION_REGION: MigrationRegionValue = {
  desaKelurahan: "",
  kecamatan: "",
  kabupatenKota: "",
  provinsi: "",
};

export function MigrationRegionFields({
  direction,
  value,
  onChange,
}: {
  direction: "asal" | "tujuan";
  value: MigrationRegionValue;
  onChange: (value: MigrationRegionValue) => void;
}) {
  const label = direction === "asal" ? "Asal" : "Tujuan";
  return (
    <>
      {[
        ["desaKelurahan", `Desa/Kelurahan ${label}`],
        ["kecamatan", `Kecamatan ${label}`],
        ["kabupatenKota", `Kabupaten/Kota ${label}`],
        ["provinsi", `Provinsi ${label}`],
      ].map(([field, fieldLabel]) => (
        <label key={field} className="text-sm font-medium text-slate-700">
          {fieldLabel} *
          <input
            required
            value={value[field as keyof MigrationRegionValue]}
            onChange={(event) =>
              onChange({ ...value, [field]: event.target.value })
            }
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
          />
        </label>
      ))}
    </>
  );
}
