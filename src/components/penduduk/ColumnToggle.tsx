"use client";

import { useState, useRef, useEffect } from "react";
import { kolomByKelompok, KELOMPOK_ORDER, KELOMPOK_LABEL } from "@/lib/indikator";
import { fieldLabel } from "@/lib/field-labels";

const GROUPED = kolomByKelompok();

export function ColumnToggle({
  visible,
  onChange,
}: {
  visible: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function toggle(col: string) {
    const next = new Set(visible);
    if (next.has(col)) next.delete(col);
    else next.add(col);
    onChange(next);
  }

  function toggleGroup(kelompok: string, allVisible: boolean) {
    const next = new Set(visible);
    for (const [name] of GROUPED[kelompok]) {
      if (allVisible) next.delete(name);
      else next.add(name);
    }
    onChange(next);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Kolom ({visible.size})
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg p-3">
          {KELOMPOK_ORDER.map((kelompok) => {
            const cols = GROUPED[kelompok];
            const allVisible = cols.every(([name]) => visible.has(name));
            return (
              <div key={kelompok} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {KELOMPOK_LABEL[kelompok]}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleGroup(kelompok, allVisible)}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    {allVisible ? "Sembunyikan semua" : "Tampilkan semua"}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-0.5">
                  {cols.map(([name, def]) => (
                    <label key={name} className="flex items-center gap-2 text-sm text-slate-700 px-1 py-0.5 rounded hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={visible.has(name)}
                        onChange={() => toggle(name)}
                        className="rounded border-slate-300"
                      />
                      {fieldLabel(name, def)}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
