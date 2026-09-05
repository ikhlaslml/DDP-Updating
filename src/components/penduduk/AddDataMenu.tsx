"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Baby, Building2, ChevronDown, HeartPulse, LogIn, LogOut, Trash2, UserPlus, UsersRound, X } from "lucide-react";

const OPTIONS = [
  { href: "/penduduk/kelahiran", title: "Kelahiran", icon: Baby, color: "bg-pink-50 text-pink-600" },
  { href: "/penduduk/migrasi-masuk", title: "Migrasi Masuk", icon: LogIn, color: "bg-sky-50 text-sky-600" },
  { href: "/penduduk/kematian", title: "Kematian", icon: HeartPulse, color: "bg-rose-50 text-rose-600" },
  { href: "/penduduk/migrasi-keluar", title: "Migrasi Keluar", icon: LogOut, color: "bg-amber-50 text-amber-600" },
  { href: "/penduduk/tambah-bangunan", title: "Tambah Bangunan", icon: Building2, color: "bg-indigo-50 text-indigo-600" },
  { href: "/penduduk/hapus-bangunan", title: "Hapus Bangunan", icon: Trash2, color: "bg-rose-50 text-rose-600" },
  { href: "/penduduk/tambah-keluarga", title: "Tambah Kepala Keluarga", icon: UsersRound, color: "bg-emerald-50 text-emerald-600" },
  { href: "/penduduk/tambah-anggota", title: "Tambah Anggota Keluarga", icon: UserPlus, color: "bg-orange-50 text-orange-600" },
];

export function AddDataMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function closeWithKeyboard(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeWithKeyboard);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeWithKeyboard);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="add-data-options"
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
      >
        Pembaruan Data <ChevronDown className="h-4 w-4" />
      </button>
      {open ? (
        <>
          <button type="button" aria-label="Tutup pilihan kegiatan" onClick={() => setOpen(false)} className="fixed inset-0 z-50 cursor-default bg-slate-950/25 backdrop-blur-[1px]" />
          <section id="add-data-options" role="dialog" aria-modal="true" aria-labelledby="add-data-options-title" className="fixed inset-x-4 top-1/2 z-[60] w-auto -translate-y-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:left-1/2 sm:w-[min(760px,calc(100vw-3rem))] sm:-translate-x-1/2">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-5">
              <div>
                <h2 id="add-data-options-title" className="text-base font-bold text-slate-900">Pilih kegiatan</h2>
              </div>
              <button type="button" onClick={() => { setOpen(false); buttonRef.current?.focus(); }} aria-label="Tutup" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"><X className="h-5 w-5" /></button>
            </header>
            <div className="grid max-h-[calc(100dvh-11rem)] overflow-y-auto p-2 sm:grid-cols-2 sm:p-3">
              {OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <Link key={option.href} href={option.href} onClick={() => setOpen(false)} className="flex min-h-14 items-center gap-3 rounded-xl p-3 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${option.color}`}><Icon className="h-5 w-5" /></span>
                    <span className="min-w-0"><strong className="block text-sm text-slate-900">{option.title}</strong></span>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
