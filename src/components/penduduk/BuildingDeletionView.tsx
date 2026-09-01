"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, MapPin, Search, Trash2, UsersRound } from "lucide-react";
import { useCanWrite } from "@/components/providers/AuthInfo";

type BuildingOption = {
  kode: number;
  jenis: string;
  kategori: string | null;
  alamat: string | null;
  dusun: string | null;
  rw: number | null;
  rt: number | null;
  legacy: boolean;
  jumlahPenduduk: number;
  jumlahKk: number;
};

const REASONS = [
  "Bangunan sudah tidak ada",
  "Terkena gusur",
  "Rusak akibat bencana",
  "Kesalahan pencatatan bangunan",
  "Lainnya",
];

function location(building: BuildingOption) {
  return building.alamat || [building.dusun, building.rw !== null ? `RW ${building.rw}` : null, building.rt !== null ? `RT ${building.rt}` : null].filter(Boolean).join(", ") || "Lokasi belum diisi";
}

export function BuildingDeletionView() {
  const router = useRouter();
  const canWrite = useCanWrite();
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bangunan")
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error ?? "Daftar bangunan tidak dapat dimuat");
        return json.data as BuildingOption[];
      })
      .then((data) => setBuildings(data ?? []))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Daftar bangunan tidak dapat dimuat"));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("id-ID");
    if (!needle) return buildings;
    return buildings.filter((building) => `#${building.kode} ${building.kategori ?? ""} ${location(building)}`.toLocaleLowerCase("id-ID").includes(needle));
  }, [buildings, query]);
  const selected = buildings.find((building) => String(building.kode) === selectedCode) ?? null;

  async function submit() {
    if (!selected || !reason || !confirmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/staging/bangunan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aksi: "DELETE", kode: selected.kode, alasan: reason, keterangan: notes.trim() || undefined }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Penghapusan bangunan gagal diajukan.");
      router.push("/penduduk?staged=hapus-bangunan");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Penghapusan bangunan gagal diajukan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><Trash2 className="h-5 w-5" /></span><div><h2 className="text-lg font-bold text-slate-900">Pilih Bangunan yang Dihapus</h2><p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">Gunakan untuk bangunan fisik yang sudah tidak berlaku, misalnya karena gusur atau bencana. Penghuni, KK, dan riwayatnya tidak dihapus; data tersebut tetap tersedia untuk proses pemindahan/alih alamat.</p></div></div>
        {!canWrite ? <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Mode lihat: pengajuan penghapusan bangunan hanya dapat dilakukan operator desa.</p> : null}
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]"><label className="relative block"><span className="sr-only">Cari bangunan</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari kode, kategori, atau lokasi bangunan..." className="min-h-11 w-full rounded-xl border border-slate-300 py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></label><select value={selectedCode} onChange={(event) => { setSelectedCode(event.target.value); setConfirmed(false); }} className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm lg:w-80"><option value="">-- pilih bangunan --</option>{filtered.map((building) => <option key={building.kode} value={building.kode}>#{building.kode} — {building.kategori ?? building.jenis.replaceAll("_", " ")} — {location(building)}</option>)}</select></div>
      </section>

      {selected ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bangunan yang dipilih</p><h2 className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-900"><Building2 className="h-5 w-5 text-indigo-600" /> Bangunan #{selected.kode}</h2><p className="mt-1 text-sm text-slate-600">{selected.kategori ?? selected.jenis.replaceAll("_", " ")}{selected.legacy ? " · data baseline" : ""}</p></div><div className="grid grid-cols-2 gap-2 text-center text-sm"><div className="rounded-xl bg-slate-50 px-4 py-3"><UsersRound className="mx-auto mb-1 h-4 w-4 text-indigo-600" /><strong className="block text-slate-900">{selected.jumlahKk}</strong><span className="text-xs text-slate-500">KK</span></div><div className="rounded-xl bg-slate-50 px-4 py-3"><strong className="block text-slate-900">{selected.jumlahPenduduk}</strong><span className="text-xs text-slate-500">penduduk</span></div></div></div><p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" /> {location(selected)}</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2"><label className="text-sm font-medium text-slate-700">Alasan penghapusan <span className="text-rose-600">*</span><select value={reason} onChange={(event) => { setReason(event.target.value); setConfirmed(false); }} disabled={!canWrite} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"><option value="">-- pilih alasan --</option>{REASONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Keterangan tambahan (opsional)<textarea value={notes} onChange={(event) => { setNotes(event.target.value); setConfirmed(false); }} disabled={!canWrite} rows={2} maxLength={500} placeholder="Contoh: rumah roboh pada banjir tanggal ..." className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50" /></label></div>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="font-semibold text-amber-900">Penghapusan tidak menghapus penduduk.</p><p className="mt-1 text-sm text-amber-800">Setelah perubahan digabungkan, bangunan tidak lagi ditampilkan pada peta dan daftar bangunan aktif. {selected.jumlahKk} KK serta {selected.jumlahPenduduk} penduduk tetap tersimpan untuk riwayat dan dapat dipindahkan lewat alur pembaruan data.</p></div></div><label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-amber-950"><input type="checkbox" checked={confirmed} disabled={!canWrite || !reason} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-amber-400 text-rose-600 focus:ring-rose-500" /> Saya memahami bahwa yang dihapus adalah bangunan fisik dari peta aktif, bukan data penduduk.</label></div>
        {error ? <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => router.push("/penduduk")} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>{canWrite ? <button type="button" disabled={!reason || !confirmed || submitting} onClick={() => void submit()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="h-4 w-4" /> {submitting ? "Mengajukan..." : "Ajukan Penghapusan Bangunan"}</button> : null}</div>
      </section> : null}
      {!selected && !error ? <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">Pilih bangunan terlebih dahulu untuk melihat dampak penghapusan.</p> : null}
    </div>
  );
}
