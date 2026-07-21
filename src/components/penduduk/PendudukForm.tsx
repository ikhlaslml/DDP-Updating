"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { KELOMPOK_ORDER, KELOMPOK_LABEL, kolomByKelompok, ALL_COLUMNS, mapping } from "@/lib/indikator";
import { inputValueFromRecord } from "@/lib/format";
import { buildPayload } from "@/lib/payload";
import { REQUIRED_FIELDS } from "@/lib/validation";
import { FieldInput } from "./FieldInput";

const GROUPED = kolomByKelompok();

export function PendudukForm({
  mode,
  id,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: Record<string, unknown>;
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const name of ALL_COLUMNS) {
      const def = mapping.kolom[name];
      init[name] = initial ? inputValueFromRecord(initial[name], def.tipe) : "";
    }
    return init;
  });

  const errorCountByStep = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const key of Object.keys(errors)) {
      const kelompok = mapping.kolom[key]?.kelompok;
      if (kelompok) counts[kelompok] = (counts[kelompok] || 0) + 1;
    }
    return counts;
  }, [errors]);

  function setField(name: string, value: string) {
    setFormData((f) => ({ ...f, [name]: value }));
    setErrors((e) => {
      if (!e[name]) return e;
      const next = { ...e };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setGeneralError(null);
    const payload = buildPayload(formData, ALL_COLUMNS.map((n) => [n, mapping.kolom[n]] as [string, typeof mapping.kolom[string]]));

    const url = mode === "create" ? "/api/penduduk" : `/api/penduduk/${id}`;
    const method = mode === "create" ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        setErrors(json.fields || {});
        setGeneralError(json.error || "Gagal menyimpan data.");
        const firstField = Object.keys(json.fields || {})[0];
        const kelompok = firstField ? mapping.kolom[firstField]?.kelompok : undefined;
        const stepIdx = kelompok ? KELOMPOK_ORDER.indexOf(kelompok as (typeof KELOMPOK_ORDER)[number]) : -1;
        if (stepIdx >= 0) setCurrentStep(stepIdx);
        setSubmitting(false);
        return;
      }

      router.push(`/penduduk/${json.data.id}`);
    } catch {
      setGeneralError("Terjadi kesalahan jaringan.");
      setSubmitting(false);
    }
  }

  const kelompokKey = KELOMPOK_ORDER[currentStep];
  const fields = GROUPED[kelompokKey];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {KELOMPOK_ORDER.map((k, idx) => (
          <button
            key={k}
            type="button"
            onClick={() => setCurrentStep(idx)}
            className={clsx(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              idx === currentStep
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
              {idx + 1}
            </span>
            {KELOMPOK_LABEL[k]}
            {errorCountByStep[k] > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                {errorCountByStep[k]}
              </span>
            )}
          </button>
        ))}
      </div>

      {generalError && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {generalError}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 rounded-xl border border-slate-200 bg-white p-5">
        {fields.map(([name, def]) => (
          <FieldInput
            key={name}
            name={name}
            def={def}
            value={formData[name]}
            onChange={(v) => setField(name, v)}
            error={errors[name]}
            required={REQUIRED_FIELDS.has(name)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
        >
          Sebelumnya
        </button>
        <div className="flex items-center gap-2">
          {currentStep < KELOMPOK_ORDER.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.min(KELOMPOK_ORDER.length - 1, s + 1))}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Berikutnya
            </button>
          ) : null}
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Menyimpan..." : mode === "create" ? "Simpan Data" : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
