"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

type Surat = { id: string; nomor: string; templateNama: string | null; namaWarga: string | null; createdAt: string };

export function SuratKeluarCard() {
  const [total, setTotal] = useState(0);
  const [recent, setRecent] = useState<Surat[]>([]);

  useEffect(() => {
    fetch("/api/surat")
      .then((r) => r.json())
      .then((j) => {
        setTotal(j.total ?? 0);
        setRecent(j.recent ?? []);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="rounded-2xl border-l-4 border-indigo-500 border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Mail className="h-4 w-4 text-indigo-600" /> Surat Keluar
        </h3>
        <div className="text-right">
          <p className="text-xs text-slate-500">Total Diterbitkan</p>
          <p className="text-2xl font-extrabold text-indigo-600">{total}</p>
        </div>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">5 Surat Terakhir</p>
      {recent.length === 0 ? (
        <div className="mt-2 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
          Belum ada surat yang diterbitkan.
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {recent.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-medium text-slate-800">{s.templateNama ?? "Surat"}</p>
                <p className="text-xs text-slate-500">{s.namaWarga} · {s.nomor}</p>
              </div>
              <span className="text-xs text-slate-400">
                {new Date(s.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Link href="/layanan-surat" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
        Buka Layanan Surat →
      </Link>
    </section>
  );
}
