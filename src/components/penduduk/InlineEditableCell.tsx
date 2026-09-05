"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { FieldInput } from "@/components/penduduk/FieldInput";
import { formatCell, inputValueFromRecord } from "@/lib/format";
import { mapping } from "@/lib/indikator";
import { isHouseholdField } from "@/lib/survey";
import { isInlineEditableField } from "@/lib/updating-columns";
import type { ParameterRole } from "@/lib/parameter-metadata";

type CellStatus = "JATUH_TEMPO" | "MENUNGGU_PENGGABUNGAN" | "TERKINI";

const STATUS_CLASS: Record<CellStatus, string> = {
  JATUH_TEMPO: "bg-red-50 text-red-800",
  MENUNGGU_PENGGABUNGAN: "bg-amber-50 text-amber-900",
  TERKINI: "",
};

export function InlineEditableCell({
  pendudukId,
  nkk,
  field,
  value,
  status,
  personRole,
  canWrite,
  onSaved,
}: {
  pendudukId: string;
  nkk: string;
  field: string;
  value: unknown;
  status?: CellStatus;
  personRole: ParameterRole;
  canWrite: boolean;
  onSaved: () => void;
}) {
  const def = mapping.kolom[field];
  const editRole = isHouseholdField(field) ? "HEAD" : personRole;
  const editable = canWrite && isInlineEditableField(field, editRole);
  const pending = status === "MENUNGGU_PENGGABUNGAN";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const display = formatCell(value, def);
  const empty = !display || display === "-";
  const tone = status ? STATUS_CLASS[status] : "";
  const emphasis = field === "nama" ? "font-semibold text-slate-900" : "";

  function startEdit() {
    if (!editable || pending) return;
    setDraft(inputValueFromRecord(value, def?.tipe ?? "string"));
    setError(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/updating/inline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendudukId, field, value: draft, nkk }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json.error ?? "Gagal menyimpan");
        return;
      }
      setEditing(false);
      window.dispatchEvent(new Event("periodic-updating-changed"));
      onSaved();
    } catch {
      setError("Jaringan bermasalah");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div
        className="min-w-[14rem] space-y-1"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void save();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setEditing(false);
          }
        }}
      >
        <FieldInput
          name={field}
          def={def}
          value={draft}
          onChange={setDraft}
          role={editRole}
          hideLabel
          inputId={`${pendudukId}-${field}`}
        />
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        <div className="flex gap-1">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            aria-label="Simpan"
            title="Simpan"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => setEditing(false)}
            aria-label="Batal"
            title="Batal"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const title = pending
    ? "Menunggu diterapkan"
    : status === "JATUH_TEMPO"
      ? "Jatuh tempo. Ketuk untuk mengubah."
      : editable
        ? isHouseholdField(field)
          ? "Bisa diubah. Berlaku untuk seluruh anggota KK."
          : "Bisa diubah"
        : undefined;

  return (
    <button
      type="button"
      disabled={!editable}
      title={title}
      aria-label={editable ? `Ubah ${display || "isian kosong"}` : undefined}
      onClick={startEdit}
      className={`group/cell flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-left ${tone} ${
        editable ? "cursor-text hover:bg-indigo-50/80" : "cursor-default"
      } ${pending ? "cursor-not-allowed" : ""}`}
    >
      <span
        className={`min-w-0 flex-1 truncate ${emphasis} ${
          editable && !pending
            ? "border-b border-dashed border-slate-300 group-hover/cell:border-indigo-400"
            : ""
        } ${empty ? "text-slate-400" : ""}`}
      >
        {empty ? "Kosong" : display}
      </span>
      {editable && !pending ? (
        <Pencil className="h-3 w-3 shrink-0 text-slate-400 group-hover/cell:text-indigo-600" aria-hidden="true" />
      ) : null}
    </button>
  );
}
