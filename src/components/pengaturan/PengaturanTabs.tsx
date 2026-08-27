"use client";

import { useState } from "react";
import { Landmark, ShoppingBasket } from "lucide-react";
import { PengaturanView } from "@/components/pengaturan/PengaturanView";
import { HargaKomoditasView } from "@/components/pengaturan/HargaKomoditasView";

type Menu = "identitas" | "harga-komoditas";

export function PengaturanTabs({ initialMenu }: { initialMenu: Menu }) {
  const [menu, setMenu] = useState<Menu>(initialMenu);

  function changeMenu(next: Menu) {
    setMenu(next);
    const url = new URL(window.location.href);
    if (next === "harga-komoditas") url.searchParams.set("menu", next);
    else url.searchParams.delete("menu");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <div className="space-y-5">
      <nav aria-label="Bagian administrasi desa" className="grid grid-cols-1 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:inline-grid sm:grid-cols-2">
        <button type="button" onClick={() => changeMenu("identitas")} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${menu === "identitas" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          <Landmark className="h-4 w-4" /> Identitas &amp; Surat
        </button>
        <button type="button" onClick={() => changeMenu("harga-komoditas")} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${menu === "harga-komoditas" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          <ShoppingBasket className="h-4 w-4" /> Harga Komoditas
        </button>
      </nav>
      {menu === "identitas" ? <PengaturanView /> : <HargaKomoditasView />}
    </div>
  );
}
