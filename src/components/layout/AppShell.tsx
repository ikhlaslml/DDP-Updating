"use client";

import { useState } from "react";
import clsx from "clsx";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { RoleBanner } from "./RoleBanner";

export function AppShell({ children }: { children: React.ReactNode }) {
  // Desktop: sidebar shown by default, collapsible. Mobile: off-canvas drawer.
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleSidebar() {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setDesktopOpen((v) => !v);
    } else {
      setMobileOpen((v) => !v);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7FB]">
      <Sidebar desktopOpen={desktopOpen} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <div
        className={clsx(
          "flex min-h-screen flex-col transition-[padding] duration-200 ease-in-out",
          desktopOpen ? "lg:pl-64" : "lg:pl-0"
        )}
      >
        <Topbar onToggleSidebar={toggleSidebar} />
        <RoleBanner />
        <main className="flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
