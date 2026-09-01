"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { KELOMPOK_ORDER, KELOMPOK_LABEL, operationalKolomByKelompok, ALL_COLUMNS, mapping } from "@/lib/indikator";
import { inputValueFromRecord } from "@/lib/format";
import { buildPayload } from "@/lib/payload";
import { REQUIRED_FIELDS } from "@/lib/validation";
import { FieldInput } from "./FieldInput";
import { FREQUENCY_LABELS, parameterFrequency, parameterIsEditable, type UpdateFrequency } from "@/lib/parameter-metadata";

const GROUPED = operationalKolomByKelompok();

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
  const formRole = initial?.status_dalam_keluarga === "Kepala Keluarga" ? "HEAD" : mode === "create" ? "HEAD" : "MEMBER";
  const [currentStep, setCurrentStep] = useState(0);
  const [frequencyFilter, setFrequencyFilter] = useState<"ALL" | UpdateFrequency>("ALL");
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

    // Changes are staged (Data Perubahan Sementara), not written to the baseline
    // directly. They apply only when the operator clicks "Gabungkan".
    const stagingBody =
      mode === "create"
        ? { aksi: "CREATE", data: payload }
        : { aksi: "UPDATE", pendudukId: id, data: payload };

    try {
      const res = await fetch("/api/staging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stagingBody),
      });
      const json = await res.json();

      if (!res.ok) {
        setErrors(json.fields || {});
        setGeneralError(json.error || "Gagal menyimpan perubahan.");
        const firstField = Object.keys(json.fields || {})[0];
        const kelompok = firstField ? mapping.kolom[firstField]?.kelompok : undefined;
        const stepIdx = kelompok ? KELOMPOK_ORDER.indexOf(kelompok as (typeof KELOMPOK_ORDER)[number]) : -1;
        if (stepIdx >= 0) setCurrentStep(stepIdx);
        setSubmitting(false);
        return;
      }

      router.push("/penduduk");
    } catch {
      setGeneralError("Terjadi kesalahan jaringan.");
      setSubmitting(false);
    }
  }

  const roleLabel = formRole === "HEAD" ? "Kepala Keluarga" : "Anggota Keluarga";
  const availableFrequencies = ["INCIDENTAL", "SIX_MONTHS", "ANNUAL"] as const;
  const isFieldAvailable = (name: string) => parameterIsEditable(name, formRole)
    && (mode === "create" || parameterFrequency(name) !== "IMMUTABLE")
    && (frequencyFilter === "ALL" || parameterFrequency(name) === frequencyFilter);
  const activeGroups = KELOMPOK_ORDER.filter((group) => GROUPED[group].some(([name]) => isFieldAvailable(name)));
  const safeStep = Math.min(currentStep, Math.max(activeGroups.length - 1, 0));
  const kelompokKey = activeGroups[safeStep];
  const fields = kelompokKey ? GROUPED[kelompokKey] : [];
  const visibleFields = fields.filter(([name]) => isFieldAvailable(name));
  const frequencyCounts = Object.fromEntries(availableFrequencies.map((frequency) => [
    frequency,
    ALL_COLUMNS.filter((name) => parameterIsEditable(name, formRole) && parameterFrequency(name) === frequency).length,
  ])) as Record<UpdateFrequency, number>;

  return (
    <div>
      {mode === "edit" ? (
        <div className="mb-5 rounded-2xl border border-violet-100 bg-violet-50 p-4">
          <label htmlFor="update-focus" className="text-xs font-semibold uppercase tracking-wide text-violet-700">Fokus Pembaruan</label>
          <div className="relative mt-2 max-w-xl">
            <select
              id="update-focus"
              value={frequencyFilter}
              onChange={(event) => { setFrequencyFilter(event.target.value as "ALL" | UpdateFrequency); setCurrentStep(0); }}
              className="w-full appearance-none rounded-xl border border-violet-200 bg-white px-4 py-3 pr-10 text-sm font-semibold text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            >
              <option value="ALL">Semua parameter aktif · {roleLabel}</option>
              {availableFrequencies.map((frequency) => (
                <option key={frequency} value={frequency}>{FREQUENCY_LABELS[frequency]} · {roleLabel} · {frequencyCounts[frequency]} pertanyaan</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-violet-500">⌄</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-violet-700">Daftar mengikuti jenis pendataan dan jadwal parameter. Pertanyaan nonaktif, perhitungan sistem, data lama, data sementara, serta parameter yang tidak berubah tidak ditampilkan.</p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 mb-6">
        {activeGroups.map((k, idx) => (
          <button
            key={k}
            type="button"
            onClick={() => setCurrentStep(idx)}
            className={clsx(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              idx === safeStep
                ? "border-indigo-600 bg-indigo-600 text-white"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-5">
        {visibleFields.map(([name, def]) => (
          <FieldInput
            key={name}
            name={name}
            def={def}
            value={formData[name]}
            onChange={(v) => setField(name, v)}
            error={errors[name]}
            required={REQUIRED_FIELDS.has(name)}
            role={formRole}
          />
        ))}
        {visibleFields.length === 0 ? <p className="col-span-full py-8 text-center text-sm text-slate-400">Tidak ada parameter dengan jadwal ini pada kelompok terpilih.</p> : null}
      </div>

      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          disabled={safeStep === 0}
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
        >
          Sebelumnya
        </button>
        <div className="flex items-center gap-2">
          {safeStep < activeGroups.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.min(activeGroups.length - 1, s + 1))}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Berikutnya
            </button>
          ) : null}
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Menyimpan..." : mode === "create" ? "Ajukan Penambahan" : "Ajukan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
