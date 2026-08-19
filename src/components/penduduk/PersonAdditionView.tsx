"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Search, UserPlus, UsersRound } from "lucide-react";
import { SurveyEditor } from "@/components/penduduk/SurveyEditor";
import { buildPayload } from "@/lib/payload";
import { mapping } from "@/lib/indikator";
import { blankSurveyRecord, surveyColumns, type SurveyRole } from "@/lib/survey";

type BuildingOption = {
  kode: number;
  jenis: string;
  dusun: string | null;
  rw: number | null;
  rt: number | null;
  alamat: string | null;
  legacy: boolean;
};

type FamilyOption = {
  nkk: string;
  nik: string;
  nama: string;
  kodeBangunan: number | null;
  dusun: string | null;
  rw: number | null;
  rt: number | null;
  alamat: string | null;
  jumlahAnggota: number | null;
};

function toPayload(value: Record<string, string>, role: SurveyRole) {
  return buildPayload(
    value,
    surveyColumns(role).map((name) => [name, mapping.kolom[name]] as [string, typeof mapping.kolom[string]])
  );
}

export function PersonAdditionView({
  role,
  eventType,
}: {
  role: SurveyRole;
  eventType?: "KELAHIRAN" | "MIGRASI_MASUK";
}) {
  const router = useRouter();
  const [record, setRecord] = useState<Record<string, string>>(() => ({
    ...blankSurveyRecord(role),
    ...(eventType === "KELAHIRAN" ? { status_dalam_keluarga: "anak", dinamika: "hidup", menetap: "Ya" } : {}),
  }));
  const [eventDetails, setEventDetails] = useState({ tanggal: "", asal: "", tempatLahir: "", nomorDokumen: "", keterangan: "" });
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [families, setFamilies] = useState<FamilyOption[]>([]);
  const [buildingCode, setBuildingCode] = useState("");
  const [familyNkk, setFamilyNkk] = useState("");
  const [query, setQuery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isHead = role === "HEAD";

  useEffect(() => {
    if (isHead) {
      fetch("/api/bangunan")
        .then((response) => response.json())
        .then((json) => setBuildings((json.data ?? []).filter((building: BuildingOption) => building.jenis === "BERPENGHUNI")))
        .catch(() => setBuildings([]));
    }
  }, [isHead]);

  useEffect(() => {
    if (isHead) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      fetch(`/api/penduduk/keluarga?${params}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((json) => setFamilies(json.data ?? []))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setFamilies([]);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isHead, query]);

  const selectedBuilding = buildings.find((building) => String(building.kode) === buildingCode);
  const selectedFamily = families.find((family) => family.nkk === familyNkk);

  async function submit() {
    if (eventType === "MIGRASI_MASUK" && (!eventDetails.tanggal || !eventDetails.asal.trim())) {
      setGeneralError("Tanggal masuk dan daerah asal wajib diisi.");
      return;
    }
    setSubmitting(true);
    setGeneralError(null);
    setErrors({});
    try {
      const response = await fetch("/api/staging/person", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          buildingCode: isHead ? Number(buildingCode) : undefined,
          familyNkk: isHead ? undefined : familyNkk,
          eventType,
          eventData: eventType ? {
            ...eventDetails,
            tanggal: eventType === "KELAHIRAN" ? record.tgl_lahir : eventDetails.tanggal,
          } : undefined,
          data: toPayload(record, role),
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setGeneralError(json.error ?? "Gagal menyimpan perubahan.");
        setErrors(json.fields ?? {});
        return;
      }
      router.push(`/penduduk?staged=${eventType?.toLocaleLowerCase("id-ID") ?? (isHead ? "keluarga" : "anggota")}`);
      router.refresh();
    } catch {
      setGeneralError("Jaringan bermasalah. Coba simpan kembali.");
    } finally {
      setSubmitting(false);
    }
  }

  const sourceSelected = isHead ? Boolean(buildingCode) : Boolean(familyNkk);
  const HeaderIcon = isHead ? UsersRound : UserPlus;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><HeaderIcon className="h-6 w-6" /></span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{isHead ? "Pilih Bangunan yang Sudah Terdata" : "Pilih Kepala Keluarga yang Sudah Disensus"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isHead
                ? "Kepala keluarga baru harus ditautkan ke bangunan yang ada. Jika bangunannya belum ada, gunakan Tambah Bangunan terlebih dahulu."
                : "Nomor KK, koordinat, alamat, dan jawaban rumah tangga akan diwariskan otomatis—operator tidak perlu mengetik ulang."}
            </p>
          </div>
        </div>

        {isHead ? (
          <div className="mt-5">
            <label className="text-sm font-semibold text-slate-700" htmlFor="building-source">Bangunan Berpenghuni *</label>
            <select id="building-source" value={buildingCode} onChange={(event) => setBuildingCode(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm">
              <option value="">-- pilih kode bangunan --</option>
              {buildings.map((building) => (
                <option key={building.kode} value={building.kode}>#{building.kode} — {building.alamat || `${building.dusun}, RW ${building.rw}/RT ${building.rt}`}{building.legacy ? " (baseline)" : ""}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama kepala keluarga, NIK, atau No. KK..." className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 text-sm" />
            </div>
            <select value={familyNkk} onChange={(event) => setFamilyNkk(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm">
              <option value="">-- pilih kepala keluarga --</option>
              {families.map((family) => <option key={family.nkk} value={family.nkk}>{family.nama} — No. KK {family.nkk} — {family.dusun}</option>)}
            </select>
          </div>
        )}

        {selectedBuilding ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"><Building2 className="h-5 w-5 text-indigo-500" /><span><strong>Bangunan #{selectedBuilding.kode}</strong><br /><span className="text-slate-500">{selectedBuilding.alamat || `${selectedBuilding.dusun}, RW ${selectedBuilding.rw}/RT ${selectedBuilding.rt}`}</span></span></div>
        ) : null}
        {selectedFamily ? (
          <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm sm:grid-cols-3"><div><span className="text-xs text-slate-400">Kepala Keluarga</span><p className="font-semibold">{selectedFamily.nama}</p></div><div><span className="text-xs text-slate-400">Bangunan</span><p className="font-semibold">#{selectedFamily.kodeBangunan ?? "-"}</p></div><div><span className="text-xs text-slate-400">Lokasi</span><p className="font-semibold">{selectedFamily.dusun}, RW {selectedFamily.rw}/RT {selectedFamily.rt}</p></div></div>
        ) : null}
      </section>

      {generalError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{generalError}</div> : null}

      {sourceSelected ? (
        <>
          {eventType ? (
            <section className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
              <h2 className="font-bold text-sky-950">Data Peristiwa {eventType === "KELAHIRAN" ? "Kelahiran" : "Migrasi Masuk"}</h2>
              <p className="mt-1 text-sm text-sky-800">Peristiwa dicatat terpisah dari profil penduduk dan ikut masuk ke riwayat snapshot.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {eventType === "MIGRASI_MASUK" ? <label className="text-sm font-medium text-slate-700">Tanggal Masuk *<input type="date" max={new Date().toISOString().slice(0, 10)} required value={eventDetails.tanggal} onChange={(event) => setEventDetails((current) => ({ ...current, tanggal: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label> : null}
                {eventType === "MIGRASI_MASUK" ? <label className="text-sm font-medium text-slate-700">Daerah Asal *<input required value={eventDetails.asal} onChange={(event) => setEventDetails((current) => ({ ...current, asal: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label> : null}
                {eventType === "KELAHIRAN" ? <label className="text-sm font-medium text-slate-700">Tempat Lahir<input value={eventDetails.tempatLahir} onChange={(event) => setEventDetails((current) => ({ ...current, tempatLahir: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label> : null}
                <label className="text-sm font-medium text-slate-700">Nomor Dokumen Pendukung<input value={eventDetails.nomorDokumen} onChange={(event) => setEventDetails((current) => ({ ...current, nomorDokumen: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Keterangan<input value={eventDetails.keterangan} onChange={(event) => setEventDetails((current) => ({ ...current, keterangan: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label>
              </div>
            </section>
          ) : null}
          <SurveyEditor role={role} value={record} onChange={setRecord} errors={errors} idPrefix={isHead ? "new-head" : "new-member"} />
          <div className="flex justify-end border-t border-slate-200 pt-5">
            <button type="button" disabled={submitting} onClick={submit} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"><Check className="h-4 w-4" /> {submitting ? "Menyimpan..." : "Simpan ke Perubahan Sementara"}</button>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">Pilih sumber data di atas untuk membuka formulir sesuai Definisi Operasional.</div>
      )}
    </div>
  );
}
