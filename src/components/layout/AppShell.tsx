"use client";

import { useEffect, useRef, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { RoleBanner } from "./RoleBanner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  function toggleSidebar() {
    setSidebarOpen((open) => !open);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  useEffect(() => {
    if (!sidebarOpen) {
      if (wasOpen.current) menuButtonRef.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;

    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-[#F7F7FB]">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Tutup menu navigasi"
          onClick={closeSidebar}
          className="fixed inset-0 z-[1999] cursor-default bg-slate-900/40"
        />
      ) : null}
      <Sidebar open={sidebarOpen} onNavigate={closeSidebar} onClose={closeSidebar} />

      <div className="flex min-h-screen flex-col">
        <Topbar onToggleSidebar={toggleSidebar} menuButtonRef={menuButtonRef} />
        <RoleBanner />
        <main className="w-full flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
