"use client";

import Image from "next/image";
import { Building2, ImageOff, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export function DdpBuildingPhoto({ code }: { code: number }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;

    void fetch(`/api/bangunan/${code}/foto-ddp`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(payload.error || `Foto bangunan gagal dimuat (HTTP ${response.status})`);
        }
        return response.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Foto bangunan belum tersedia");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attempt, code]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm" aria-live="polite">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin" /> Memeriksa foto bangunan #{code} di Core DDP...
        </p>
      </section>
    );
  }

  if (!imageUrl) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm" aria-live="polite">
        <div className="flex items-start gap-3">
          <ImageOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="min-w-0">
            <h2 className="font-bold text-amber-950">Foto bangunan DDP belum dapat ditampilkan</h2>
            <p className="mt-1 break-words text-sm text-amber-900">{error || "Foto belum tersedia."}</p>
            <p className="mt-2 text-xs leading-relaxed text-amber-800">
              Pastikan kode bangunan <strong>{code}</strong> dan kode wilayah desa pada database sama dengan data Core DDP.
            </p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError(null);
                setImageUrl(null);
                setAttempt((value) => value + 1);
              }}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100"
            >
              <RefreshCw className="h-4 w-4" /> Coba lagi
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Building2 className="h-5 w-5 text-indigo-600" />
        <h2 className="font-bold text-slate-900">Foto Bangunan Core DDP</h2>
      </div>
      <Image
        src={imageUrl}
        alt={`Foto bangunan DDP nomor ${code}`}
        width={900}
        height={600}
        unoptimized
        className="max-h-80 w-full rounded-xl object-cover"
      />
      <figcaption className="px-1 pt-2 text-xs text-slate-500">Foto bangunan dari pendataan Data Desa Presisi.</figcaption>
    </figure>
  );
}
