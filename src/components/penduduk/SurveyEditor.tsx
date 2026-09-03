"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { FieldInput } from "@/components/penduduk/FieldInput";
import { KELOMPOK_LABEL, KELOMPOK_ORDER, mapping } from "@/lib/indikator";
import { REQUIRED_FIELDS } from "@/lib/validation";
import { isConditionalFieldVisible, surveyColumnsByGroup, type SurveyRole } from "@/lib/survey";

export function SurveyEditor({
  role,
  value,
  onChange,
  errors = {},
  idPrefix,
  allowedGroups,
}: {
  role: SurveyRole;
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  errors?: Record<string, string>;
  idPrefix: string;
  allowedGroups?: readonly string[];
}) {
  const grouped = useMemo(() => surveyColumnsByGroup(role), [role]);
  const groups = KELOMPOK_ORDER.filter((group) => grouped[group]?.length && (!allowedGroups || allowedGroups.includes(group)));
  const [currentGroup, setCurrentGroup] = useState(groups[0]);
  const activeGroup = groups.includes(currentGroup) ? currentGroup : groups[0];

  function setField(name: string, nextValue: string) {
    const next = { ...value, [name]: nextValue };
    // Do not retain answers from a branch that is no longer applicable (for
    // example phone details after changing ownership to "Tidak").
    for (const field of Object.keys(next)) {
      if (!isConditionalFieldVisible(field, next, role)) next[field] = "";
    }
    onChange(next);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          {role === "HEAD"
            ? allowedGroups?.length === 1
              ? "Pada alur tambah keluarga baru, cukup isi Aspek 1 — Identitas Keluarga. Aspek 2–6 dapat dilengkapi melalui Lanjutkan Pendataan."
              : "Isi data kepala keluarga dan kondisi rumah tangga. Lokasi serta beberapa isian teknis akan diisi otomatis oleh sistem."
            : "Untuk anggota keluarga, isi hanya data individu. Nomor KK, bangunan, alamat, dan data rumah tangga mengikuti kepala keluarga."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pb-1">
        {groups.map((group, index) => {
          const fields = grouped[group].filter((name) => isConditionalFieldVisible(name, value, role));
          const filled = fields.filter((name) => value[name] !== undefined && value[name] !== "").length;
          const hasError = fields.some((name) => errors[name]);
          return (
            <button
              key={group}
              type="button"
              onClick={() => setCurrentGroup(group)}
              className={clsx(
                "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition",
                activeGroup === group
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                  : hasError
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
              )}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">{index + 1}</span>
              {KELOMPOK_LABEL[group]}
              {filled === fields.length && fields.length > 0 ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-3">
        {(grouped[activeGroup] ?? [])
          .filter((name) => isConditionalFieldVisible(name, value, role))
          .map((name) => {
            const def = role === "MEMBER" && name === "status_dalam_keluarga"
              ? { ...mapping.kolom[name], enum: mapping.kolom[name].enum?.filter((option) => option !== "Kepala Keluarga") }
              : mapping.kolom[name];
            return (
            <FieldInput
              key={name}
              inputId={`${idPrefix}-${name}`}
              name={name}
              def={def}
              value={value[name] ?? ""}
              onChange={(next) => setField(name, next)}
              error={errors[name]}
              required={REQUIRED_FIELDS.has(name)}
              role={role}
            />
            );
          })}
      </div>
    </div>
  );
}
