"use client";

import Image from "next/image";
import { useState } from "react";

export function DdpBuildingPhoto({ code }: { code: number }) {
  const [available, setAvailable] = useState(true);
  if (!available) return null;
  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <Image
        src={`/api/bangunan/${code}/foto-ddp`}
        alt={`Foto bangunan DDP nomor ${code}`}
        width={900}
        height={600}
        unoptimized
        onError={() => setAvailable(false)}
        className="max-h-80 w-full rounded-xl object-cover"
      />
      <figcaption className="px-1 pt-2 text-xs text-slate-500">Foto bangunan dari Core Data Desa Presisi · dimuat berdasarkan kode bangunan dan kode desa tenant.</figcaption>
    </figure>
  );
}
