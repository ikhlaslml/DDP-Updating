"use client";

import { useEffect, useState } from "react";

type Death = { id: string; nama: string | null; nik: string | null; nkk: string | null; tanggal: string; penyebab: string | null; punyaAkta: string | null };
type Event = { id: string; jenis: string; tanggal: string; nama: string | null; nik: string | null; nkk: string | null };

export function DemographicHistory({ mode }: { mode: "DEATH" | "EVENT" }) {
  const [deaths, setDeaths] = useState<Death[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  useEffect(() => { fetch("/api/peristiwa?view=history").then((response) => response.json()).then((json) => { setDeaths(json.deaths ?? []); setEvents(json.events ?? []); }).catch(() => {}); }, []);
  const rows = mode === "DEATH" ? deaths : events;
  return <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-900">{mode === "DEATH" ? "Tabel Arsip Kematian" : "Riwayat Peristiwa Kependudukan"}</h2><div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">Jenis</th><th className="px-3 py-2">Nama</th><th className="px-3 py-2">NIK</th><th className="px-3 py-2">No. KK</th>{mode === "DEATH" ? <><th className="px-3 py-2">Penyebab</th><th className="px-3 py-2">Akta</th></> : null}</tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="px-3 py-2">{new Date(row.tanggal).toLocaleDateString("id-ID")}</td><td className="px-3 py-2">{"jenis" in row ? row.jenis.replaceAll("_", " ") : "KEMATIAN"}</td><td className="px-3 py-2 font-medium">{row.nama}</td><td className="px-3 py-2">{row.nik}</td><td className="px-3 py-2">{row.nkk}</td>{mode === "DEATH" && "penyebab" in row ? <><td className="px-3 py-2">{row.penyebab ?? "-"}</td><td className="px-3 py-2">{row.punyaAkta ?? "-"}</td></> : null}</tr>) : <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">Belum ada peristiwa yang telah digabungkan.</td></tr>}</tbody></table></div></section>;
}
