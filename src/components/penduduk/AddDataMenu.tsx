"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Building2, ChevronDown, UserPlus, UsersRound } from "lucide-react";

const OPTIONS = [
  {
    href: "/penduduk/tambah-bangunan",
    title: "Tambah Bangunan",
    description: "Digitasi bangunan baru beserta seluruh penghuninya.",
    icon: Building2,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    href: "/penduduk/tambah-keluarga",
    title: "Tambah Kepala Keluarga",
    description: "Tambahkan KK baru pada bangunan yang sudah terdata.",
    icon: UsersRound,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    href: "/penduduk/tambah-anggota",
    title: "Tambah Anggota Keluarga",
    description: "Tambahkan individu pada KK yang sudah disensus.",
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
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
      >
        <span className="text-lg leading-none">+</span> Tambah Data <ChevronDown className="h-4 w-4" />
      </button>
      {open ? (
        <div id="add-data-options" className="absolute right-0 z-40 mt-2 w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="px-3 pb-2 pt-1"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pilih jenis pembaruan</p></div>
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <Link key={option.href} href={option.href} onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-slate-50">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${option.color}`}><Icon className="h-5 w-5" /></span>
                <span><strong className="block text-sm text-slate-900">{option.title}</strong><span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{option.description}</span></span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
