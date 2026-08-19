"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function InfoPopup({ title, content, onClose }: { title: string; content: string; onClose: () => void }) {
  useEffect(() => {
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [onClose]);

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Petunjuk pengisian ${title}`}
        className="relative max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <button type="button" onClick={onClose} aria-label="Tutup petunjuk" className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X className="h-5 w-5" />
        </button>
        <p className="pr-10 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Petunjuk Pengisian</p>
        <h2 className="mt-2 pr-10 text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">{content}</p>
        <p className="mt-5 text-xs text-slate-400">Klik di mana saja atau tekan Esc untuk menutup informasi.</p>
      </section>
    </div>
  );
}
