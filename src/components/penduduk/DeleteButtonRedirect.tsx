"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteButtonRedirect({ id, nama }: { id: string; nama: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
        <span className="text-red-700">Ajukan hapus {nama}?</span>
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            const res = await fetch("/api/staging", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ aksi: "DELETE", pendudukId: id }),
            });
            if (res.ok) {
              router.push("/penduduk");
              router.refresh();
            } else {
              setLoading(false);
            }
          }}
          className="font-semibold text-red-700 hover:underline disabled:opacity-50"
        >
          {loading ? "Mengajukan..." : "Ya, ajukan hapus"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-slate-500 hover:underline">
          Batal
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      title="Hapus data"
      aria-label={`Hapus data ${nama}`}
      onClick={() => setConfirming(true)}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
