"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LayoutDashboard, Users, Map, FileSpreadsheet, Home } from "lucide-react";

const NAV = [
  { href: "/", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/penduduk", label: "Data Penduduk", icon: Users },
  { href: "/peta", label: "Peta Sebaran", icon: Map },
  { href: "/impor-ekspor", label: "Impor / Ekspor", icon: FileSpreadsheet },
];

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Home; active: boolean }) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-indigo-50 text-indigo-600"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-100 bg-white">
      <div className="flex items-center gap-2.5 px-6 h-16 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
          D
        </div>
        <span className="font-bold text-slate-900 tracking-tight">Dashboard Desa</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4">
        <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Menu</p>
        <div className="space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
            />
          ))}
        </div>
      </nav>

      <div className="px-4 py-4">
        <div className="rounded-xl bg-indigo-50 p-4">
          <p className="text-xs font-semibold text-indigo-700">Data Desa Presisi</p>
          <p className="text-xs text-indigo-500 mt-1 leading-relaxed">
            269 parameter sensus dalam 6 kelompok indikator.
          </p>
        </div>
      </div>
    </aside>
  );
}
