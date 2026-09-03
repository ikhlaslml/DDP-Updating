"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Baby, Building2, ChevronDown, ClipboardPenLine, HeartPulse, LogIn, LogOut, Trash2, UserPlus, UsersRound, X } from "lucide-react";

const OPTIONS = [
  {
    href: "/penduduk/kelahiran",
    title: "Kelahiran",
    description: "Catat bayi lahir pada keluarga yang sudah terdata.",
    icon: Baby,
    color: "bg-pink-50 text-pink-600",
  },
  {
    href: "/penduduk/migrasi-masuk",
    title: "Migrasi Masuk",
    description: "Catat warga atau keluarga yang pindah masuk ke desa.",
    icon: LogIn,
    color: "bg-sky-50 text-sky-600",
  },
  {
    href: "/penduduk/kematian",
    title: "Kematian",
    description: "Catat penduduk yang meninggal dan simpan riwayatnya.",
    icon: HeartPulse,
    color: "bg-rose-50 text-rose-600",
  },
  {
    href: "/penduduk/migrasi-keluar",
    title: "Migrasi Keluar",
    description: "Catat penduduk atau keluarga yang pindah keluar desa.",
    icon: LogOut,
    color: "bg-amber-50 text-amber-600",
  },
  {
    href: "/penduduk/tambah-bangunan",
    title: "Tambah Bangunan",
    description: "Tambahkan bangunan baru ke peta dan data desa.",
    icon: Building2,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    href: "/penduduk/hapus-bangunan",
    title: "Hapus Bangunan",
    description: "Catat bangunan yang sudah tidak ada di peta.",
    icon: Trash2,
    color: "bg-rose-50 text-rose-600",
  },
  {
    href: "/penduduk/tambah-keluarga",
    title: "Tambah Kepala Keluarga",
    description: "Catat keluarga baru pada bangunan yang sudah ada.",
    icon: UsersRound,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    href: "/penduduk/tambah-anggota",
    title: "Tambah Anggota Keluarga",
    description: "Catat anggota pada keluarga yang sudah ada.",
    icon: UserPlus,
    color: "bg-orange-50 text-orange-600",
  },
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
        <ClipboardPenLine className="h-4 w-4" /> Catat Perubahan <ChevronDown className="h-4 w-4" />
      </button>
      {open ? (
        <>
          <button type="button" aria-label="Tutup pilihan kegiatan" onClick={() => setOpen(false)} className="fixed inset-0 z-50 cursor-default bg-slate-950/25 backdrop-blur-[1px]" />
          <section id="add-data-options" role="dialog" aria-modal="true" aria-labelledby="add-data-options-title" className="fixed inset-x-4 top-1/2 z-[60] w-auto -translate-y-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:left-1/2 sm:w-[min(760px,calc(100vw-3rem))] sm:-translate-x-1/2">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-5">
              <div>
                <h2 id="add-data-options-title" className="text-base font-bold text-slate-900">Pilih kegiatan</h2>
                <p className="mt-1 text-sm text-slate-500">Pilih perubahan data yang ingin dicatat.</p>
              </div>
              <button type="button" onClick={() => { setOpen(false); buttonRef.current?.focus(); }} aria-label="Tutup" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"><X className="h-5 w-5" /></button>
            </header>
            <div className="grid max-h-[calc(100dvh-11rem)] overflow-y-auto p-2 sm:grid-cols-2 sm:p-3">
              {OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <Link key={option.href} href={option.href} onClick={() => setOpen(false)} className="flex min-h-[5.75rem] items-start gap-3 rounded-xl p-3 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${option.color}`}><Icon className="h-5 w-5" /></span>
                    <span className="min-w-0"><strong className="block text-sm text-slate-900">{option.title}</strong><span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{option.description}</span></span>
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
