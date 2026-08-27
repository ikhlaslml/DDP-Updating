"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, LoaderCircle, UserRoundCheck } from "lucide-react";
import { compressRespondentPhoto } from "@/lib/client-media";
import { getRespondentDraft, saveRespondentDraft } from "@/lib/respondent-draft";

export type RespondentIdentityValue = { nama: string; photo: File | null };

export function RespondentIdentityFields({
  value,
  onChange,
  draftKey,
}: {
  value: RespondentIdentityValue;
  onChange: (value: RespondentIdentityValue) => void;
  draftKey: string;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    getRespondentDraft(draftKey)
      .then((draft) => {
        if (draft && !value.nama && !value.photo) onChange({ nama: draft.nama, photo: draft.photo });
      })
      .catch(() => {})
      .finally(() => { hydrated.current = true; });
    // Hydrate once for this flow key; parent values intentionally are not dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (!hydrated.current) return;
    const timer = window.setTimeout(() => {
      saveRespondentDraft(draftKey, { ...value, updatedAt: Date.now() }).catch(() => {});
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draftKey, value]);

  const preview = useMemo(() => value.photo ? URL.createObjectURL(value.photo) : null, [value.photo]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function selectPhoto(file?: File) {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const compressed = await compressRespondentPhoto(file);
      onChange({ ...value, photo: compressed });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Foto tidak dapat diproses.");
    } finally {
      setProcessing(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  }

  return (
    <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><UserRoundCheck className="h-5 w-5" /></span>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Identitas Responden</h2>
          <p className="mt-1 text-sm text-slate-500">Wajib diisi sebelum membuka Aspek 1. Draf nama dan foto tersimpan di perangkat ini saat halaman dimuat ulang atau jaringan terputus.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
        <label className="min-w-0 text-sm font-semibold text-slate-700">
          Nama Responden *
          <input
            value={value.nama}
            onChange={(event) => onChange({ ...value, nama: event.target.value })}
            autoComplete="name"
            maxLength={150}
            placeholder="Nama lengkap orang yang diwawancarai"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <div>
          <p className="text-sm font-semibold text-slate-700">Foto Responden *</p>
          <div className="mt-1 flex min-h-44 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
            {preview ? <Image src={preview} alt="Pratinjau foto responden" width={440} height={352} unoptimized className="h-44 w-full object-cover" /> : <span className="px-4 text-center text-xs text-slate-400">Belum ada foto</span>}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => selectPhoto(event.target.files?.[0])} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(event) => selectPhoto(event.target.files?.[0])} />
        <button type="button" disabled={processing} onClick={() => cameraRef.current?.click()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">
          {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Ambil dari Kamera
        </button>
        <button type="button" disabled={processing} onClick={() => galleryRef.current?.click()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 sm:w-auto">
          <ImagePlus className="h-4 w-4" /> Pilih dari Galeri
        </button>
        {value.photo ? <span className="self-center text-center text-xs font-medium text-emerald-700 sm:text-left">Foto terkompresi: {Math.ceil(value.photo.size / 1024)} KB</span> : null}
      </div>
      {error ? <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
    </section>
  );
}
