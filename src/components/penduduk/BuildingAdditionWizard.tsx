"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  MapPinned,
  Store,
  Users,
} from "lucide-react";
import { SurveyEditor } from "@/components/penduduk/SurveyEditor";
import { NON_RESIDENTIAL_CATEGORIES, type SpatialPoint } from "@/lib/building";
import { buildPayload } from "@/lib/payload";
import { mapping } from "@/lib/indikator";
import { blankSurveyRecord, surveyColumns, type SurveyRole } from "@/lib/survey";

const BuildingDigitizer = dynamic(
  () => import("@/components/peta/BuildingDigitizer").then((module) => module.BuildingDigitizer),
  {
    ssr: false,
    loading: () => <div className="flex min-h-[420px] items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">Menyiapkan peta digitasi...</div>,
  }
);

type BuildingForm = {
  jenis: "BERPENGHUNI" | "TIDAK_BERPENGHUNI";
  kategori: string;
  keterangan: string;
  fotoUrl: string;
  dusun: string;
  rw: string;
  rt: string;
  alamat: string;
};

const STEPS = [
  { title: "Digitasi", subtitle: "Gambar batas atap", icon: MapPinned },
  { title: "Bangunan", subtitle: "Jenis dan alamat", icon: Building2 },
  { title: "Penghuni", subtitle: "Kepala dan anggota", icon: Users },
  { title: "Tinjau", subtitle: "Masuk staging", icon: Check },
];

function payload(values: Record<string, string>, role: SurveyRole) {
  return {
    ...buildPayload(
    values,
    surveyColumns(role).map((name) => [name, mapping.kolom[name]] as [string, typeof mapping.kolom[string]])
    ),
    responden: values.responden || "Tidak",
  };
}

function isAdult(dateValue: string | undefined) {
  if (!dateValue) return false;
  const birth = new Date(dateValue);
  if (Number.isNaN(birth.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return age >= 18;
}

export function BuildingAdditionWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [points, setPoints] = useState<SpatialPoint[]>([]);
  const [center, setCenter] = useState<[number, number]>([-7.6, 110.2]);
  const [droneTilePrefix, setDroneTilePrefix] = useState<string | null>(null);
  const [spatialContextReady, setSpatialContextReady] = useState(false);
  const [building, setBuilding] = useState<BuildingForm>({
    jenis: "BERPENGHUNI",
    kategori: "",
    keterangan: "",
    fotoUrl: "",
    dusun: "",
    rw: "",
    rt: "",
    alamat: "",
  });
  const [head, setHead] = useState(() => blankSurveyRecord("HEAD"));
  const [members, setMembers] = useState<Record<string, string>[]>([]);
  const [selectedPerson, setSelectedPerson] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/bangunan")
      .then((response) => response.json())
      .then((json) => {
        if (typeof json.context?.centerLat === "number" && typeof json.context?.centerLng === "number") {
          setCenter([json.context.centerLat, json.context.centerLng]);
        } else {
          const first = json.data?.find((item: { centroidLat?: number; centroidLng?: number }) =>
            Number.isFinite(item.centroidLat) && Number.isFinite(item.centroidLng)
          );
          if (first) setCenter([first.centroidLat, first.centroidLng]);
        }
        const code = String(json.context?.kodeWilayah ?? "").replace(/\D/g, "");
        const fallback = code.length === 10
          ? `${code.slice(0, 2)}.${code.slice(2, 4)}.${code.slice(4, 6)}.${code.slice(6)}`
          : null;
        setDroneTilePrefix(json.context?.droneTilePrefix ?? fallback);
      })
      .catch(() => {})
      .finally(() => setSpatialContextReady(true));
  }, []);

  const occupied = building.jenis === "BERPENGHUNI";
  const allPeople = useMemo(() => [head, ...members], [head, members]);

  function setMemberCount(nextCount: number) {
    const count = Math.max(0, Math.min(30, nextCount));
    const respondentIndex = head.responden === "Ya"
      ? 0
      : members.findIndex((member) => member.responden === "Ya") + 1;
    if (respondentIndex > count) setHead((current) => ({ ...current, responden: "Ya" }));
    setMembers((current) => {
      if (current.length === count) return current;
      if (current.length > count) return current.slice(0, count);
      return [
        ...current,
        ...Array.from({ length: count - current.length }, () => blankSurveyRecord("MEMBER")),
      ];
    });
    setSelectedPerson((current) => Math.min(current, count));
  }

  function setRespondent(personIndex: number) {
    setHead((current) => ({ ...current, responden: personIndex === 0 ? "Ya" : "Tidak" }));
    setMembers((current) => current.map((member, index) => ({
      ...member,
      responden: index + 1 === personIndex ? "Ya" : "Tidak",
    })));
  }

  function validateCurrentStep() {
    setGeneralError(null);
    if (step === 0 && points.length < 3) {
      setGeneralError("Digitasi minimal tiga sudut bangunan sebelum melanjutkan.");
      return false;
    }
    if (step === 1) {
      if (!building.dusun || !building.rw || !building.rt) {
        setGeneralError("Dusun, RW, dan RT wajib diisi.");
        return false;
      }
      if (!occupied && !building.kategori) {
        setGeneralError("Pilih kategori bangunan tidak berpenghuni.");
        return false;
      }
      if (!occupied && (!building.keterangan.trim() || !building.fotoUrl)) {
        setGeneralError("Nama/jenis spesifik dan foto bangunan tidak berpenghuni wajib dilengkapi sesuai DO DDP.");
        return false;
      }
    }
    if (step === 2 && occupied) {
      const required = ["nama", "nik", "nkk", "jk", "tgl_lahir"];
      const missingHead = required.find((field) => !head[field]);
      if (missingHead) {
        setGeneralError("Lengkapi identitas wajib kepala keluarga sebelum melanjutkan.");
        return false;
      }
      const incompleteMember = members.findIndex((member) =>
        ["nama", "nik", "jk", "tgl_lahir", "status_dalam_keluarga"].some((field) => !member[field])
      );
      if (incompleteMember >= 0) {
        setSelectedPerson(incompleteMember + 1);
        setGeneralError(`Lengkapi identitas wajib anggota keluarga ${incompleteMember + 1}.`);
        return false;
      }
    }
    return true;
  }

  function next() {
    if (!validateCurrentStep()) return;
    if (step === 1 && !occupied) setStep(3);
    else setStep((current) => Math.min(3, current + 1));
  }

  function back() {
    if (step === 3 && !occupied) setStep(1);
    else setStep((current) => Math.max(0, current - 1));
  }

  async function readPhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setGeneralError("Foto bangunan harus berupa gambar.");
      return;
    }
    if (file.size > 1_000_000) {
      setGeneralError("Ukuran foto maksimal 1 MB agar unggahan tetap cepat.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setBuilding((current) => ({ ...current, fotoUrl: String(reader.result ?? "") }));
    reader.readAsDataURL(file);
  }

  async function submit() {
    setSubmitting(true);
    setGeneralError(null);
    setErrors({});
    try {
      const response = await fetch("/api/staging/bangunan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building: {
            ...building,
            rw: Number(building.rw),
            rt: Number(building.rt),
            points,
          },
          head: occupied ? payload(head, "HEAD") : null,
          members: occupied ? members.map((member) => payload(member, "MEMBER")) : [],
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setGeneralError(json.error ?? "Gagal menyimpan penambahan bangunan.");
        setErrors(json.fields ?? {});
        return;
      }
      router.push("/penduduk?staged=bangunan");
      router.refresh();
    } catch {
      setGeneralError("Jaringan bermasalah. Coba simpan kembali.");
    } finally {
      setSubmitting(false);
    }
  }

  const currentPerson = allPeople[selectedPerson] ?? head;
  const currentRole: SurveyRole = selectedPerson === 0 ? "HEAD" : "MEMBER";
  const currentErrors = Object.fromEntries(
    Object.entries(errors).flatMap(([key, value]) => {
      const prefix = selectedPerson === 0 ? "head." : `members.${selectedPerson - 1}.`;
      if (key.startsWith(prefix)) return [[key.slice(prefix.length), value]];
      if (!key.includes(".")) return [[key, value]];
      return [];
    })
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {STEPS.map((item, index) => {
          const Icon = item.icon;
          const disabled = !occupied && index === 2;
          return (
            <div
              key={item.title}
              className={clsx(
                "flex items-center gap-3 rounded-xl border px-4 py-3",
                step === index
                  ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                  : step > index || (step === 3 && disabled)
                    ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-500",
                disabled && "opacity-50"
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm"><Icon className="h-4 w-4" /></span>
              <div><p className="text-sm font-semibold">{item.title}</p><p className="text-xs opacity-75">{item.subtitle}</p></div>
            </div>
          );
        })}
      </div>

      {generalError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{generalError}</div>
      ) : null}

      {step === 0 ? (
        spatialContextReady ? (
          <BuildingDigitizer points={points} onChange={setPoints} center={center} droneTilePrefix={droneTilePrefix} />
        ) : (
          <div className="flex min-h-[420px] items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
            Menyiapkan lokasi dan layer peta desa...
          </div>
        )
      ) : null}

      {step === 1 ? (
        <section className="space-y-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Klasifikasi Bangunan</h2>
            <p className="mt-1 text-sm text-slate-500">Pilih berdasarkan pemakaian aktual bangunan sesuai Definisi Operasional DDP.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setBuilding((current) => ({ ...current, jenis: "BERPENGHUNI", kategori: "" }))}
              className={clsx("flex items-start gap-4 rounded-2xl border-2 p-5 text-left", occupied ? "border-indigo-500 bg-indigo-50" : "border-slate-200")}
            >
              <Home className={clsx("h-6 w-6", occupied ? "text-indigo-600" : "text-slate-400")} />
              <span><strong className="block text-slate-900">Bangunan Berpenghuni</strong><span className="mt-1 block text-sm text-slate-500">Ditinggali satu atau lebih keluarga; lanjutkan sensus seluruh penghuni.</span></span>
            </button>
            <button
              type="button"
              onClick={() => setBuilding((current) => ({ ...current, jenis: "TIDAK_BERPENGHUNI" }))}
              className={clsx("flex items-start gap-4 rounded-2xl border-2 p-5 text-left", !occupied ? "border-orange-500 bg-orange-50" : "border-slate-200")}
            >
              <Store className={clsx("h-6 w-6", !occupied ? "text-orange-600" : "text-slate-400")} />
              <span><strong className="block text-slate-900">Bangunan Tidak Berpenghuni</strong><span className="mt-1 block text-sm text-slate-500">Usaha, fasilitas publik, kandang, rumah kosong, dan bangunan nonhunian lain.</span></span>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {!occupied ? (
              <label className="text-sm font-medium text-slate-700">Kategori Bangunan *
                <select value={building.kategori} onChange={(event) => setBuilding((current) => ({ ...current, kategori: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5">
                  <option value="">-- pilih kategori --</option>
                  {NON_RESIDENTIAL_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
            ) : null}
            <label className="text-sm font-medium text-slate-700">Dusun/Kampung/Dukuh *
              <input value={building.dusun} onChange={(event) => setBuilding((current) => ({ ...current, dusun: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            </label>
            <label className="text-sm font-medium text-slate-700">Rukun Warga (RW) *
              <input type="number" min="0" value={building.rw} onChange={(event) => setBuilding((current) => ({ ...current, rw: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            </label>
            <label className="text-sm font-medium text-slate-700">Rukun Tetangga (RT) *
              <input type="number" min="0" value={building.rt} onChange={(event) => setBuilding((current) => ({ ...current, rt: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Alamat/Keterangan Lokasi
              <input value={building.alamat} onChange={(event) => setBuilding((current) => ({ ...current, alamat: event.target.value }))} placeholder="Nama jalan, blok, patokan..." className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            </label>
            {!occupied ? (
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Nama atau Jenis Spesifik *
                <input value={building.keterangan} onChange={(event) => setBuilding((current) => ({ ...current, keterangan: event.target.value }))} placeholder="Contoh: Bengkel Sinar Jaya, Masjid Al-Ikhlas" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
              </label>
            ) : null}
            <label className="text-sm font-medium text-slate-700">Foto Bangunan{!occupied ? " *" : ""} (portrait, maks. 1 MB)
              <input type="file" accept="image/*" onChange={(event) => readPhoto(event.target.files?.[0])} className="mt-1 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-indigo-700" />
              {building.fotoUrl ? (
                <Image
                  src={building.fotoUrl}
                  alt="Pratinjau foto bangunan"
                  width={160}
                  height={200}
                  unoptimized
                  className="mt-3 h-32 w-24 rounded-xl object-cover ring-1 ring-slate-200"
                />
              ) : null}
            </label>
          </div>
        </section>
      ) : null}

      {step === 2 && occupied ? (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div><h2 className="text-xl font-bold text-slate-900">Penghuni Bangunan</h2><p className="mt-1 text-sm text-slate-500">Satu kepala keluarga dan seluruh orang yang tinggal/ditanggung dalam rumah ini.</p></div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold text-slate-600">Responden Wawancara
                <select value={Math.max(0, allPeople.findIndex((person) => person.responden === "Ya"))} onChange={(event) => setRespondent(Number(event.target.value))} className="mt-1 block min-w-48 rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value={0}>Kepala Keluarga</option>
                  {members.map((member, index) => <option key={index} value={index + 1} disabled={Boolean(member.tgl_lahir) && !isAdult(member.tgl_lahir)}>Anggota {index + 1}{member.nama ? ` — ${member.nama}` : ""}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">Jumlah anggota selain kepala
                <input type="number" min="0" max="30" value={members.length} onChange={(event) => setMemberCount(Number(event.target.value))} className="mt-1 block w-32 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </label>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {allPeople.map((person, index) => (
              <button key={index} type="button" onClick={() => setSelectedPerson(index)} className={clsx("shrink-0 rounded-xl border px-4 py-3 text-left", selectedPerson === index ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white")}>
                <span className="block text-xs font-semibold text-indigo-600">{index === 0 ? "Kepala Keluarga" : `Anggota ${index}`}</span>
                <span className="mt-0.5 block text-sm font-medium text-slate-800">{person.nama || "Belum diisi"}</span>
              </button>
            ))}
          </div>
          <SurveyEditor
            role={currentRole}
            value={currentPerson}
            onChange={(next) => {
              if (selectedPerson === 0) setHead(next);
              else setMembers((current) => current.map((member, index) => index === selectedPerson - 1 ? next : member));
            }}
            errors={currentErrors}
            idPrefix={`building-person-${selectedPerson}`}
          />
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div><h2 className="text-xl font-bold text-slate-900">Tinjau Sebelum Masuk Perubahan Sementara</h2><p className="mt-1 text-sm text-slate-500">Belum mengubah baseline. Operator masih dapat membatalkan grup ini sebelum penggabungan.</p></div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-400">Spasial</p><p className="mt-2 font-semibold text-slate-900">{points.length} titik polygon</p><p className="text-sm text-slate-500">Centroid dihitung otomatis oleh server</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-400">Bangunan</p><p className="mt-2 font-semibold text-slate-900">{occupied ? "Berpenghuni" : building.kategori}</p><p className="text-sm text-slate-500">{building.dusun}, RW {building.rw}/RT {building.rt}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-400">Penghuni</p><p className="mt-2 font-semibold text-slate-900">{occupied ? `${members.length + 1} orang` : "Tidak ada penghuni"}</p><p className="text-sm text-slate-500">{occupied ? head.nama || "Kepala belum diisi" : "Tidak membuat baris penduduk"}</p></div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Setelah disimpan, bangunan dan seluruh penghuninya tampil sebagai satu grup di Data Perubahan Sementara.</div>
        </section>
      ) : null}

      <div className="flex items-center justify-between border-t border-slate-200 pt-5">
        <button type="button" disabled={step === 0 || submitting} onClick={back} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Sebelumnya</button>
        {step < 3 ? (
          <button type="button" onClick={next} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Lanjutkan <ChevronRight className="h-4 w-4" /></button>
        ) : (
          <button type="button" disabled={submitting} onClick={submit} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><Check className="h-4 w-4" /> {submitting ? "Menyimpan..." : "Simpan ke Perubahan Sementara"}</button>
        )}
      </div>
    </div>
  );
}
