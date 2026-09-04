"use client";

import { useEffect, useState } from "react";
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

  function closeMobileSidebar() {
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;

    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeMobileSidebar();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-[#F7F7FB]">
      <Sidebar desktopOpen={desktopOpen} mobileOpen={mobileOpen} onNavigate={closeMobileSidebar} />

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
