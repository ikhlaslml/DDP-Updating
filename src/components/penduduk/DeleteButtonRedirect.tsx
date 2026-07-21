"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteButtonRedirect({ id, nama }: { id: string; nama: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
        <span className="text-red-700">Hapus {nama}?</span>
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            const res = await fetch(`/api/penduduk/${id}`, { method: "DELETE" });
            if (res.ok) {
              router.push("/penduduk");
              router.refresh();
            } else {
              setLoading(false);
            }
          }}
          className="font-semibold text-red-700 hover:underline disabled:opacity-50"
        >
          {loading ? "Menghapus..." : "Ya, hapus"}
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
      onClick={() => setConfirming(true)}
      className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
    >
      Hapus
    </button>
  );
}
