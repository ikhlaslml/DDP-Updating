"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, X } from "lucide-react";
import { RespondentIdentityFields, type RespondentIdentityValue } from "@/components/penduduk/RespondentIdentityFields";
import { uploadMedia, type UploadedMedia } from "@/lib/client-media";
import { clearRespondentDraft } from "@/lib/respondent-draft";

export function RespondentVisitForm({ code }: { code: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<RespondentIdentityValue>({ nama: "", photo: null });
  const [uploaded, setUploaded] = useState<UploadedMedia | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftKey = `respondent-visit-${code}`;

  async function save() {
    if (!value.nama.trim() || !value.photo) return;
    setSaving(true);
    setError(null);
    try {
      const media = uploaded ?? await uploadMedia(value.photo, "RESPONDEN");
      if (!uploaded) setUploaded(media);
      const response = await fetch(`/api/bangunan/${code}/responden`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: value.nama.trim(), mediaAssetId: media.id, fotoUrl: media.url }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Kunjungan gagal disimpan.");
      await clearRespondentDraft(draftKey).catch(() => {});
      setValue({ nama: "", photo: null });
      setUploaded(null);
      setOpen(false);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kunjungan gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Catat Kunjungan Baru</button>;
  }

  return (
    <div className="w-full basis-full space-y-4">
      <RespondentIdentityFields
        value={value}
        onChange={(next) => { setValue(next); setUploaded(null); }}
        draftKey={draftKey}
      />
      {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
      <div className="flex flex-col justify-end gap-2 sm:flex-row">
        <button type="button" disabled={saving} onClick={() => setOpen(false)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 sm:w-auto"><X className="h-4 w-4" /> Tutup</button>
        <button type="button" disabled={saving || !value.nama.trim() || !value.photo} onClick={save} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto"><Check className="h-4 w-4" /> {saving ? "Menyimpan..." : "Simpan Kunjungan"}</button>
      </div>
    </div>
  );
}
