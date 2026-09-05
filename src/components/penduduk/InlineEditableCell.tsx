"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
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
  const tone = status ? STATUS_CLASS[status] : "";

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
      <div className="min-w-[14rem] space-y-1" onClick={(event) => event.stopPropagation()}>
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
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-indigo-600 px-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Simpan
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => setEditing(false)}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 px-2 text-xs font-semibold text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
            Batal
          </button>
        </div>
      </div>
    );
  }

  const title = pending
    ? "Menunggu penggabungan"
    : status === "JATUH_TEMPO"
      ? "Jatuh tempo. Klik untuk mengubah isian ini saja."
      : editable
        ? isHouseholdField(field)
          ? "Klik untuk mengubah. Perubahan berlaku untuk seluruh anggota KK."
          : "Klik untuk mengubah isian ini saja."
        : undefined;

  return (
    <button
      type="button"
      disabled={!editable}
      title={title}
      onClick={startEdit}
      className={`block w-full rounded-md px-1.5 py-1 text-left ${tone} ${
        editable
          ? "cursor-pointer hover:ring-1 hover:ring-indigo-300"
          : "cursor-default"
      } ${pending ? "cursor-not-allowed" : ""}`}
    >
      {display}
    </button>
  );
}
