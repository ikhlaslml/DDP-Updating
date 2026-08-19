"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import type { KolomDef } from "@/lib/indikator";
import { enumOptionLabel, fieldLabel } from "@/lib/field-labels";
import {
  FREQUENCY_LABELS,
  parameterFrequency,
  parameterHelp,
  parameterInputType,
  parameterOptions,
  type ParameterRole,
} from "@/lib/parameter-metadata";

export function FieldInput({
  name,
  def,
  value,
  onChange,
  error,
  required,
  inputId,
  role,
}: {
  name: string;
  def: KolomDef;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  inputId?: string;
  role?: ParameterRole;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const id = inputId ?? name;
  const metadataOptions = parameterOptions(name, role);
  const options = metadataOptions.length ? metadataOptions : def.enum ?? [];
  const inputType = parameterInputType(name, role);
  const help = parameterHelp(name, role);
  const frequency = parameterFrequency(name);
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
  const baseClass =
    "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 " +
    (error ? "border-red-400" : "border-slate-300");

  let input: React.ReactNode;

  if (inputType === "multiselect" && options.length) {
    const selected = new Set(value.split(";").map((item) => item.trim()).filter(Boolean));
    input = (
      <div id={id} className="grid max-h-48 gap-2 overflow-y-auto rounded-lg border border-slate-300 bg-slate-50 p-3 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option} className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={selected.has(option)}
              onChange={(event) => {
                const next = new Set(selected);
                if (event.target.checked) next.add(option);
                else next.delete(option);
                onChange([...next].join("; "));
              }}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            <span>{enumOptionLabel(name, option)}</span>
          </label>
        ))}
      </div>
    );
  } else if (options.length) {
    input = (
      <select id={id} name={name} value={value} onChange={(e) => onChange(e.target.value)} className={baseClass} required={required}>
        <option value="">-- pilih --</option>
        {value && !options.includes(value) ? <option value={value}>{enumOptionLabel(name, value)} (data lama)</option> : null}
        {options.map((opt) => (
          <option key={opt} value={opt}>{enumOptionLabel(name, opt)}</option>
        ))}
      </select>
    );
  } else if (def.tipe === "boolean") {
    input = (
      <select id={id} name={name} value={value} onChange={(e) => onChange(e.target.value)} className={baseClass}>
        <option value="">-- pilih --</option>
        <option value="true">Ya</option>
        <option value="false">Tidak</option>
      </select>
    );
  } else if (def.tipe === "date") {
    input = (
      <input
        id={id}
        name={name}
        type="date"
        max={localToday}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={baseClass}
        required={required}
      />
    );
  } else if (def.tipe === "int" || def.tipe === "float") {
    input = (
      <input
        id={id}
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
        id={id}
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
      <label htmlFor={id} className="block text-xs font-medium text-slate-600 mb-1">
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <span>{fieldLabel(name, def)}</span>
          {frequency ? <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{FREQUENCY_LABELS[frequency]}</span> : null}
          {help ? (
            <button
              type="button"
              aria-label={`Petunjuk pengisian ${fieldLabel(name, def)}`}
              aria-expanded={showHelp}
              onClick={() => setShowHelp((current) => !current)}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-indigo-600 hover:bg-indigo-50"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </span>
        {required && <span className="text-red-500"> *</span>}
      </label>
      {showHelp && help ? <div role="note" className="mb-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs leading-relaxed text-indigo-900">{help}</div> : null}
      {input}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
