"use client";

import type { KolomDef } from "@/lib/indikator";

export function FieldInput({
  name,
  def,
  value,
  onChange,
  error,
  required,
}: {
  name: string;
  def: KolomDef;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
}) {
  const baseClass =
    "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 " +
    (error ? "border-red-400" : "border-slate-300");

  let input: React.ReactNode;

  if (def.enum) {
    input = (
      <select id={name} name={name} value={value} onChange={(e) => onChange(e.target.value)} className={baseClass} required={required}>
        <option value="">-- pilih --</option>
        {def.enum.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  } else if (def.tipe === "boolean") {
    input = (
      <select id={name} name={name} value={value} onChange={(e) => onChange(e.target.value)} className={baseClass}>
        <option value="">-- pilih --</option>
        <option value="true">Ya</option>
        <option value="false">Tidak</option>
      </select>
    );
  } else if (def.tipe === "date") {
    input = (
      <input
        id={name}
        name={name}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={baseClass}
        required={required}
      />
    );
  } else if (def.tipe === "int" || def.tipe === "float") {
    input = (
      <input
        id={name}
        name={name}
        type="number"
        step={def.tipe === "float" ? "any" : "1"}
        min={name === "lat" ? -11 : name === "lng" ? 95 : 0}
        max={name === "lat" ? 6 : name === "lng" ? 141 : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={baseClass}
        required={required}
      />
    );
  } else {
    input = (
      <input
        id={name}
        name={name}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={baseClass}
        required={required}
        maxLength={name === "nik" || name === "nkk" ? 16 : undefined}
        inputMode={name === "nik" || name === "nkk" ? "numeric" : undefined}
      />
    );
  }

  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-slate-600 mb-1">
        {def.label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {input}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
