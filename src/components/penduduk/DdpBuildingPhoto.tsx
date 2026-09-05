"use client";

import Image from "next/image";
import { Building2, ImageOff, Maximize2, RefreshCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.25;

function BuildingPhotoImage({ src, code, zoom }: { src: string; code: number; zoom: number }) {
  return (
    <Image
      src={src}
      alt={`Foto bangunan DDP nomor ${code}`}
      width={1600}
      height={1200}
      unoptimized
      className="mx-auto h-auto max-w-none object-contain"
      style={{ width: `${Math.round(zoom * 100)}%`, height: "auto" }}
    />
  );
}

function ZoomToolbar({
  zoom,
  onZoom,
  extra,
}: {
  zoom: number;
  onZoom: (next: number) => void;
  extra: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={() => onZoom(zoom - ZOOM_STEP)}
        disabled={zoom <= ZOOM_MIN}
        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ZoomOut className="h-3.5 w-3.5" /> Perkecil
      </button>
      <span className="min-w-12 text-center text-xs font-semibold text-slate-500">{Math.round(zoom * 100)}%</span>
      <button
        type="button"
        onClick={() => onZoom(zoom + ZOOM_STEP)}
        disabled={zoom >= ZOOM_MAX}
        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ZoomIn className="h-3.5 w-3.5" /> Perbesar
      </button>
      {extra}
    </div>
  );
}

export function DdpBuildingPhoto({ code }: { code: number }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);

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

  useEffect(() => {
    if (!expanded) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  function changeZoom(next: number) {
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(next / ZOOM_STEP) * ZOOM_STEP)));
  }

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
    <figure className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-indigo-600" />
          <h2 className="font-bold text-slate-900">Foto Bangunan Core DDP</h2>
        </div>
        <ZoomToolbar
          zoom={zoom}
          onZoom={changeZoom}
          extra={(
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Layar penuh
            </button>
          )}
        />
      </div>
      <div className="overflow-auto rounded-xl bg-slate-100">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="block w-full cursor-zoom-in p-2"
          aria-label="Buka foto bangunan ukuran penuh"
        >
          <BuildingPhotoImage src={imageUrl} code={code} zoom={zoom} />
        </button>
      </div>
      {expanded ? (
        <div
          role="presentation"
          onClick={() => setExpanded(false)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-[2px]"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Foto bangunan DDP nomor ${code}`}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white p-3 shadow-2xl"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-sm font-bold text-slate-900">Foto bangunan #{code}</p>
              <ZoomToolbar
                zoom={zoom}
                onZoom={changeZoom}
                extra={(
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    aria-label="Tutup foto"
                    className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <X className="h-3.5 w-3.5" /> Tutup
                  </button>
                )}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-xl bg-slate-100 p-2">
              <BuildingPhotoImage src={imageUrl} code={code} zoom={zoom} />
            </div>
          </div>
        </div>
      ) : null}
    </figure>
  );
}
