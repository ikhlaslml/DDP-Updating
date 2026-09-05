"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Send } from "lucide-react";
import {
  EMPTY_MIGRATION_REGION,
  MigrationRegionFields,
  type MigrationRegionValue,
} from "@/components/penduduk/MigrationRegionFields";

type Resident = {
  id: string;
  nama: string | null;
  nik: string | null;
  nkk: string | null;
  status_dalam_keluarga: string | null;
  tgl_lahir: string | null;
  jk: string | null;
  dusun: string | null;
};

const DEATH_CAUSES = [
  "Tanpa Sebab",
  "Sakit",
  "Kecelakaan Lalu Lintas",
  "Kecelakaan Kerja",
  "Korban Bencana Alam",
  "Bunuh Diri",
  "Korban Pembunuhan",
  "Tidak Bersedia Menjawab",
];

export function DemographicExitView({ type }: { type: "KEMATIAN" | "MIGRASI_KELUAR" }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [residents, setResidents] = useState<Resident[]>([]);
  const [family, setFamily] = useState<Resident[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [scope, setScope] = useState<"INDIVIDUAL" | "FAMILY">("INDIVIDUAL");
  const [tanggal, setTanggal] = useState("");
  const [replacementId, setReplacementId] = useState("");
  const [penyebab, setPenyebab] = useState("");
  const [punyaAkta, setPunyaAkta] = useState("");
  const [nomorAkta, setNomorAkta] = useState("");
  const [destination, setDestination] = useState<MigrationRegionValue>(EMPTY_MIGRATION_REGION);
  const [alasan, setAlasan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/peristiwa?${new URLSearchParams(query.trim() ? { q: query.trim() } : {})}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((json) => setResidents(json.data ?? []))
        .catch((caught: unknown) => {
          if (!(caught instanceof DOMException && caught.name === "AbortError")) setResidents([]);
        });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  const selected = residents.find((resident) => resident.id === selectedId) ?? family.find((resident) => resident.id === selectedId);

  useEffect(() => {
    if (!selected?.nkk) return;
    fetch(`/api/peristiwa?q=${encodeURIComponent(selected.nkk)}`)
      .then((response) => response.json())
      .then((json) => setFamily(json.data ?? []))
      .catch(() => setFamily([]));
  }, [selected?.nkk]);

  const replacementRequired = selected?.status_dalam_keluarga === "Kepala Keluarga" && scope === "INDIVIDUAL" && family.some((member) => member.id !== selected.id);
  const replacementOptions = useMemo(() => family.filter((member) => member.id !== selectedId), [family, selectedId]);

  async function submit() {
    if (!selected || !tanggal) {
      setError("Pilih penduduk dan tanggal peristiwa.");
      return;
    }
    if (replacementRequired && !replacementId) {
      setError("Kepala keluarga pengganti wajib dipilih.");
      return;
    }
    if (
      type === "MIGRASI_KELUAR" &&
      Object.values(destination).some((value) => !value.trim())
    ) {
      setError("Desa/kelurahan, kecamatan, kabupaten/kota, dan provinsi tujuan wajib diisi.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/peristiwa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        pendudukId: selected.id,
        scope,
        tanggal,
        replacementId: replacementId || undefined,
        penyebab,
        punyaAkta,
        nomorAkta,
        ...(type === "MIGRASI_KELUAR" ? destination : {}),
        alasan,
      }),
    });
    const json = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) {
      setError(json.error ?? "Peristiwa gagal disimpan.");
      return;
    }
    router.push(`/penduduk?staged=${type.toLocaleLowerCase("id-ID")}`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Pilih Penduduk</h2>
        <div className="relative mt-4 max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, NIK, atau No. KK..." className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 text-sm" /></div>
        <select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setReplacementId(""); setFamily([]); }} className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm">
          <option value="">-- pilih penduduk aktif --</option>
          {residents.map((resident) => <option key={resident.id} value={resident.id}>{resident.nama} — NIK {resident.nik} — {resident.status_dalam_keluarga} — {resident.dusun}</option>)}
        </select>
        {selected ? <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-4"><div><span className="text-xs text-slate-400">Nama</span><p className="font-semibold">{selected.nama}</p></div><div><span className="text-xs text-slate-400">No. KK</span><p className="font-semibold">{selected.nkk}</p></div><div><span className="text-xs text-slate-400">Status</span><p className="font-semibold">{selected.status_dalam_keluarga}</p></div><div><span className="text-xs text-slate-400">Anggota Aktif</span><p className="font-semibold">{family.length || 1} orang</p></div></div> : null}
      </section>

      {selected ? <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Rincian {type === "KEMATIAN" ? "Kematian" : "Migrasi Keluar"}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">Tanggal Peristiwa *<input type="date" max={new Date().toISOString().slice(0, 10)} value={tanggal} onChange={(event) => setTanggal(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          {type === "MIGRASI_KELUAR" ? <label className="text-sm font-medium text-slate-700">Cakupan *<select value={scope} onChange={(event) => { setScope(event.target.value as "INDIVIDUAL" | "FAMILY"); setReplacementId(""); }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="INDIVIDUAL">Individu</option><option value="FAMILY">Seluruh keluarga</option></select></label> : null}
          {type === "KEMATIAN" ? <label className="text-sm font-medium text-slate-700">Penyebab Kematian *<select value={penyebab} onChange={(event) => setPenyebab(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="">-- pilih --</option>{DEATH_CAUSES.map((cause) => <option key={cause}>{cause}</option>)}</select></label> : null}
          {type === "KEMATIAN" ? <label className="text-sm font-medium text-slate-700">Kepemilikan Akta Kematian<select value={punyaAkta} onChange={(event) => setPunyaAkta(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="">-- pilih --</option><option value="Ya">Ya</option><option value="Tidak">Tidak</option></select></label> : null}
          {type === "KEMATIAN" && punyaAkta === "Ya" ? <label className="text-sm font-medium text-slate-700">Nomor Akta Kematian<input value={nomorAkta} onChange={(event) => setNomorAkta(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label> : null}
          {type === "MIGRASI_KELUAR" ? (
            <MigrationRegionFields direction="tujuan" value={destination} onChange={setDestination} />
          ) : null}
          {type === "MIGRASI_KELUAR" ? <label className="text-sm font-medium text-slate-700">Alasan Pindah<input value={alasan} onChange={(event) => setAlasan(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label> : null}
          {replacementRequired ? <label className="text-sm font-medium text-slate-700">Kepala Keluarga Pengganti *<select value={replacementId} onChange={(event) => setReplacementId(event.target.value)} className="mt-1 w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5"><option value="">-- pilih anggota --</option>{replacementOptions.map((member) => <option key={member.id} value={member.id}>{member.nama} — {member.status_dalam_keluarga}</option>)}</select></label> : null}
        </div>
      </section> : null}

      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
      {selected ? <div className="flex justify-end"><button type="button" disabled={submitting} onClick={submit} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"><Send className="h-4 w-4" />{submitting ? "Menyimpan..." : "Simpan ke Perubahan Sementara"}</button></div> : null}
    </div>
  );
}
