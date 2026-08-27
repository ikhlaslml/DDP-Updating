"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Search, ChevronDown, LogOut, Menu } from "lucide-react";
import { useAuthInfo } from "@/components/providers/AuthInfo";

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { email, role } = useAuthInfo();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/penduduk?q=${encodeURIComponent(query.trim())}`);
  }

  const initial = (email || "?").trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 h-16 shrink-0 border-b border-slate-100 bg-white/80 backdrop-blur">
      <div className="flex h-full min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <button
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
              placeholder="Cari nama, NIK, NKK..."
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </form>

        <div className="relative ml-auto shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
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
                {role === "pemerintah_desa" ? "Pemerintah Desa (lihat)" : "Operator"}
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
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
