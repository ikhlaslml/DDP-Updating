"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Bell, Search, ChevronDown, Menu } from "lucide-react";
import { useAuthInfo } from "@/components/providers/AuthInfo";

export function Topbar({
  onToggleSidebar,
  menuButtonRef,
}: {
  onToggleSidebar: () => void;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const { email, role } = useAuthInfo();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [reminders, setReminders] = useState<{
    sixMonths: { dueFamilies: number; dueMembers: number; dueFields: number };
    annual: { dueFamilies: number; dueMembers: number; dueFields: number };
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setNotificationOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    function refreshReminders() {
      fetch("/api/updating/reminders/count")
        .then((response) => (response.ok ? response.json() : null))
        .then(setReminders)
        .catch(() => setReminders(null));
    }
    refreshReminders();
    window.addEventListener("periodic-updating-changed", refreshReminders);
    return () => window.removeEventListener("periodic-updating-changed", refreshReminders);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/penduduk?q=${encodeURIComponent(query.trim())}`);
  }

  const initial = (email || "?").trim().charAt(0).toUpperCase();
  const dueFamilies =
    (reminders?.sixMonths.dueFamilies ?? 0) + (reminders?.annual.dueFamilies ?? 0);
  const dueFields =
    (reminders?.sixMonths.dueFields ?? 0) + (reminders?.annual.dueFields ?? 0);

  return (
    <header className="sticky top-0 z-20 h-16 shrink-0 border-b border-slate-100 bg-white/80 backdrop-blur">
      <div className="flex h-full min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={onToggleSidebar}
          aria-label="Buka/tutup menu"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        >
          <Menu className="h-5 w-5" />
        </button>
        <form onSubmit={handleSearch} className="min-w-0 max-w-md flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama, NIK, No. KK..."
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </form>

        <div className="relative ml-auto flex shrink-0 items-center gap-1">
        <div className="relative shrink-0" ref={notificationRef}>
          <button
            type="button"
            onClick={() => {
              setNotificationOpen((current) => !current);
              setOpen(false);
            }}
            aria-label={`${dueFields} isian jatuh tempo`}
            aria-expanded={notificationOpen}
            className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          >
            <Bell className="h-5 w-5" />
            {dueFamilies > 0 ? (
              <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {dueFamilies > 99 ? "99+" : dueFamilies}
              </span>
            ) : null}
          </button>
          {notificationOpen ? (
            <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-100 bg-white p-3 shadow-xl">
              <div className="px-2 pb-2">
                <p className="font-semibold text-slate-900">Pembaruan Berkala</p>
              </div>
              {[
                ["6 Bulan", "6-bulan", reminders?.sixMonths],
                ["1 Tahun", "1-tahun", reminders?.annual],
              ].map(([label, slug, value]) => {
                const summary = value as NonNullable<typeof reminders>["sixMonths"] | undefined;
                return (
                  <Link
                    key={slug as string}
                    href={`/penduduk/pembaruan-berkala?siklus=${slug}`}
                    onClick={() => setNotificationOpen(false)}
                    className="flex min-h-14 items-center justify-between rounded-xl px-3 py-2 hover:bg-slate-50"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">Siklus {label as string}</span>
                      <span className="block text-xs text-slate-500">
                        {summary?.dueFamilies ?? 0} keluarga · {summary?.dueFields ?? 0} isian
                      </span>
                    </span>
                    <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                      {summary?.dueFamilies ?? 0}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              setOpen((o) => !o);
              setNotificationOpen(false);
            }}
            className="flex min-h-11 items-center gap-2 rounded-xl px-1.5 py-1.5 hover:bg-slate-50 sm:px-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
              {initial}
            </span>
            <span className="hidden sm:block text-left">
              <span className="block text-sm font-medium text-slate-800 leading-tight max-w-[180px] truncate">
                {email}
              </span>
              <span className="block text-[11px] leading-tight text-slate-400">
                {role === "pemerintah_desa" ? "Hanya melihat" : "Operator Desa"}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-red-600"
              >
                Keluar
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </header>
  );
}
