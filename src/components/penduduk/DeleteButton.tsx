"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

export function DeleteButton({ id, nama, onDeleted }: { id: string; nama: string; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <span className="text-slate-600">Ajukan hapus {nama}?</span>
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
            setLoading(false);
            if (res.ok) {
              setConfirming(false);
              onDeleted();
            }
          }}
          className="font-semibold text-red-600 hover:underline disabled:opacity-50"
        >
          {loading ? "..." : "Ya"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-slate-500 hover:underline"
        >
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
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
