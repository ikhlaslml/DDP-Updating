"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LayoutDashboard, Users, Map, FileSpreadsheet } from "lucide-react";

const NAV = [
  { href: "/", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/penduduk", label: "Data Penduduk", icon: Users },
  { href: "/peta", label: "Peta Sebaran", icon: Map },
  { href: "/impor-ekspor", label: "Impor/Ekspor", icon: FileSpreadsheet },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden flex items-center gap-1 overflow-x-auto border-b border-slate-100 bg-white px-3 py-2">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium",
              active ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
