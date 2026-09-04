"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { NAV_SECTIONS } from "./nav";
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
        "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
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
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [mobileOpen]);

  return (
    <aside
      role={mobileOpen ? "dialog" : undefined}
      aria-modal={mobileOpen || undefined}
      aria-label={mobileOpen ? "Menu navigasi" : undefined}
      className={clsx(
        "fixed inset-0 z-[2000] flex w-full flex-col border-r border-slate-100 bg-white overscroll-contain transition-transform duration-200 ease-in-out lg:inset-y-0 lg:left-0 lg:right-auto lg:z-40 lg:w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        desktopOpen ? "lg:translate-x-0" : "lg:-translate-x-full"
      )}
    >
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-100 px-5 sm:px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
          D
        </div>
        <span className="font-bold text-slate-900 tracking-tight truncate">{desaNama}</span>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onNavigate}
          aria-label="Tutup menu"
          className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-8" aria-label="Navigasi utama">
        <div className="space-y-4">
          {NAV_SECTIONS.map((section) => {
            const showSectionLabel = section.label !== "Ringkasan";
            const sectionLabelId = `nav-${section.label.toLocaleLowerCase("id-ID").replaceAll(" ", "-")}`;

            return (
              <section key={section.label} aria-labelledby={showSectionLabel ? sectionLabelId : undefined}>
                {showSectionLabel ? <p id={sectionLabelId} className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{section.label}</p> : null}
                <div className="space-y-1">
                  {section.items.map((item) => (
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
              </section>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
