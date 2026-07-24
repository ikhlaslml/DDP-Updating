"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { NAV } from "./nav";
import { useAuthInfo } from "@/components/providers/AuthInfo";

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function Sidebar({
  desktopOpen,
  mobileOpen,
  onNavigate,
}: {
  desktopOpen: boolean;
  mobileOpen: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const { desaNama } = useAuthInfo();

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-100 bg-white transition-transform duration-200 ease-in-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        desktopOpen ? "lg:translate-x-0" : "lg:-translate-x-full"
      )}
    >
      <div className="flex items-center gap-2.5 px-6 h-16 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
          D
        </div>
        <span className="font-bold text-slate-900 tracking-tight truncate">{desaNama}</span>
        <button
          type="button"
          onClick={onNavigate}
          aria-label="Tutup menu"
          className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
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
              onClick={onNavigate}
            />
          ))}
        </div>
      </nav>

      <div className="px-4 py-4">
        <div className="rounded-xl bg-indigo-50 p-4">
          <p className="text-xs font-semibold text-indigo-700">Data Desa Presisi</p>
          <p className="text-xs text-indigo-500 mt-1 leading-relaxed">
            286 parameter sensus dalam 6 kelompok indikator.
          </p>
        </div>
      </div>
    </aside>
  );
}
