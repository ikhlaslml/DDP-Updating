"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Building2, Check, ChevronRight, Search, UserPlus, UsersRound } from "lucide-react";
import { SurveyEditor } from "@/components/penduduk/SurveyEditor";
import { RespondentIdentityFields, type RespondentIdentityValue } from "@/components/penduduk/RespondentIdentityFields";
import { buildPayload } from "@/lib/payload";
import { uploadMedia, type UploadedMedia } from "@/lib/client-media";
import { clearRespondentDraft } from "@/lib/respondent-draft";
import { mapping } from "@/lib/indikator";
import { blankSurveyRecord, surveyColumns, type SurveyRole } from "@/lib/survey";
import {
  EMPTY_MIGRATION_REGION,
  MigrationRegionFields,
  type MigrationRegionValue,
} from "@/components/penduduk/MigrationRegionFields";

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

type FamilyMember = {
  id: string;
  nama: string | null;
  nik: string | null;
  jk: string | null;
  status_dalam_keluarga: string | null;
};

type EventDetails = MigrationRegionValue & {
  tanggal: string;
  tempatLahir: string;
  nomorDokumen: string;
  keterangan: string;
  nikIbu: string;
  namaIbu: string;
  anakKe: string;
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
    ...(eventType === "KELAHIRAN" ? { status_dalam_keluarga: "Anak", dinamika: "hidup", menetap: "Ya" } : {}),
  }));
  const [eventDetails, setEventDetails] = useState<EventDetails>({
    ...EMPTY_MIGRATION_REGION,
    tanggal: "",
    tempatLahir: "",
    nomorDokumen: "",
    keterangan: "",
    nikIbu: "",
    namaIbu: "",
    anakKe: "",
  });
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [families, setFamilies] = useState<FamilyOption[]>([]);
  const [buildingCode, setBuildingCode] = useState("");
  const [familyNkk, setFamilyNkk] = useState("");
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [motherId, setMotherId] = useState("");
  const [query, setQuery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [respondent, setRespondent] = useState<RespondentIdentityValue>({ nama: "", photo: null });
  const [respondentAccepted, setRespondentAccepted] = useState(false);
  const [uploadedRespondent, setUploadedRespondent] = useState<UploadedMedia | null>(null);
  const [eventAccepted, setEventAccepted] = useState(false);
  const [extraMembers, setExtraMembers] = useState<Record<string, string>[]>([]);
  const [selectedPerson, setSelectedPerson] = useState(0);
  const isHead = role === "HEAD";
  const editingHead = !isHead || selectedPerson === 0;

  function setMemberCount(nextCount: number) {
    const count = Math.max(0, Math.min(30, nextCount));
    setExtraMembers((current) => {
      if (current.length === count) return current;
      if (current.length > count) return current.slice(0, count);
      return [
        ...current,
        ...Array.from({ length: count - current.length }, () => blankSurveyRecord("MEMBER")),
      ];
    });
    setSelectedPerson((current) => Math.min(current, count));
  }

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

  useEffect(() => {
    if (!familyNkk || eventType !== "KELAHIRAN") return;
    fetch(`/api/peristiwa?q=${encodeURIComponent(familyNkk)}`)
      .then((response) => response.json())
      .then((json) => setFamilyMembers(json.data ?? []))
      .catch(() => setFamilyMembers([]));
  }, [eventType, familyNkk]);

  async function submit() {
    if (
      eventType === "MIGRASI_MASUK" &&
      (!eventDetails.tanggal ||
        [eventDetails.desaKelurahan, eventDetails.kecamatan, eventDetails.kabupatenKota, eventDetails.provinsi]
          .some((value) => !value.trim()))
    ) {
      setGeneralError("Tanggal masuk dan struktur wilayah asal wajib diisi lengkap.");
      return;
    }
    if (isHead) {
      const missingHead = ["nama", "nik", "nkk", "jk", "tgl_lahir"].find((field) => !record[field]);
      if (missingHead) {
        setSelectedPerson(0);
        setGeneralError("Lengkapi identitas wajib kepala keluarga sebelum menyimpan.");
        return;
      }
      const incompleteMember = extraMembers.findIndex((member) =>
        ["nama", "nik", "jk", "tgl_lahir", "status_dalam_keluarga"].some((field) => !member[field])
      );
      if (incompleteMember >= 0) {
        setSelectedPerson(incompleteMember + 1);
        setGeneralError(`Lengkapi identitas wajib anggota keluarga ${incompleteMember + 1}.`);
        return;
      }
    }
    if (
      eventType === "KELAHIRAN" &&
      (!record.tgl_lahir ||
        !eventDetails.tempatLahir.trim() ||
        !/^\d{16}$/.test(eventDetails.nikIbu) ||
        !eventDetails.namaIbu.trim() ||
        !/^\d+$/.test(eventDetails.anakKe) ||
        Number(eventDetails.anakKe) < 1)
    ) {
      setGeneralError("Tanggal dan tempat lahir, identitas ibu, serta urutan anak wajib diisi.");
      return;
    }
    setSubmitting(true);
    setGeneralError(null);
    setErrors({});
    try {
      let respondentPayload: { nama: string; mediaAssetId: string; fotoUrl: string } | undefined;
      if (isHead) {
        if (!respondent.nama.trim() || !respondent.photo) {
          setGeneralError("Nama dan foto responden wajib diisi sebelum melanjutkan.");
          return;
        }
        const media = uploadedRespondent ?? await uploadMedia(respondent.photo, "RESPONDEN");
        if (!uploadedRespondent) setUploadedRespondent(media);
        respondentPayload = { nama: respondent.nama.trim(), mediaAssetId: media.id, fotoUrl: media.url };
      }
      const response = await fetch("/api/staging/person", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          buildingCode: isHead ? Number(buildingCode) : undefined,
          familyNkk: isHead ? undefined : familyNkk,
          eventType,
          respondent: respondentPayload,
          eventData: eventType ? {
            ...eventDetails,
            tanggal: eventType === "KELAHIRAN" ? record.tgl_lahir : eventDetails.tanggal,
          } : undefined,
          data: toPayload(record, role),
          members: isHead ? extraMembers.map((member) => toPayload(member, "MEMBER")) : undefined,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setGeneralError(json.error ?? "Gagal menyimpan perubahan.");
        setErrors(json.fields ?? {});
        return;
      }
      if (isHead) await clearRespondentDraft(`new-family-${buildingCode}`).catch(() => {});
      if (isHead && json.data?.buildingCode) router.push(`/bangunan/${json.data.buildingCode}`);
      else router.push(`/penduduk?staged=${eventType?.toLocaleLowerCase("id-ID") ?? "anggota"}`);
      router.refresh();
    } catch {
      setGeneralError("Jaringan bermasalah. Coba simpan kembali.");
    } finally {
      setSubmitting(false);
    }
  }

  const sourceSelected = isHead ? Boolean(buildingCode) : Boolean(familyNkk);
  const respondentComplete = Boolean(respondent.nama.trim() && respondent.photo);
  const HeaderIcon = isHead ? UsersRound : UserPlus;
  const editorRole: SurveyRole = editingHead ? role : "MEMBER";
  const editorValue = editingHead ? record : extraMembers[selectedPerson - 1] ?? record;
  const currentErrors = Object.fromEntries(
    Object.entries(errors).flatMap(([key, value]) => {
      if (!isHead || selectedPerson === 0) {
        if (key.startsWith("members.")) return [];
        return [[key, value]];
      }
      const prefix = `members.${selectedPerson - 1}.`;
      if (key.startsWith(prefix)) return [[key.slice(prefix.length), value]];
      return [];
    })
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><HeaderIcon className="h-6 w-6" /></span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{isHead ? "Pilih Bangunan yang Sudah Terdata" : "Pilih Kepala Keluarga yang Sudah Disensus"}</h2>
          </div>
        </div>

        {isHead ? (
          <div className="mt-5">
            <label className="text-sm font-semibold text-slate-700" htmlFor="building-source">Bangunan Berpenghuni *</label>
            <select id="building-source" value={buildingCode} onChange={(event) => setBuildingCode(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm">
              <option value="">-- pilih kode bangunan --</option>
              {buildings.map((building) => (
                <option key={building.kode} value={building.kode}>#{building.kode} — {building.alamat || `${building.dusun}, RW ${building.rw}/RT ${building.rt}`}{building.legacy ? " (data awal)" : ""}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama kepala keluarga, NIK, atau No. KK..." className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 text-sm" />
            </div>
            <select value={familyNkk} onChange={(event) => {
              setFamilyNkk(event.target.value);
              setFamilyMembers([]);
              setMotherId("");
              setEventDetails((current) => ({ ...current, nikIbu: "", namaIbu: "" }));
            }} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm">
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

      {sourceSelected && isHead ? (
        <>
          <RespondentIdentityFields
            value={respondent}
            onChange={(next) => {
              setRespondent(next);
              setUploadedRespondent(null);
              setRespondentAccepted(false);
            }}
            draftKey={`new-family-${buildingCode}`}
          />
          {!respondentAccepted ? (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!respondentComplete}
                onClick={() => setRespondentAccepted(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Lanjut ke Pendataan Keluarga <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {sourceSelected && (!isHead || respondentAccepted) ? (
        <>
          {eventType ? (
            <section className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
              <h2 className="font-bold text-sky-950">Data Peristiwa {eventType === "KELAHIRAN" ? "Kelahiran" : "Migrasi Masuk"}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {eventType === "MIGRASI_MASUK" ? <label className="text-sm font-medium text-slate-700">Tanggal Masuk *<input type="date" max={new Date().toISOString().slice(0, 10)} required value={eventDetails.tanggal} onChange={(event) => setEventDetails((current) => ({ ...current, tanggal: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label> : null}
                {eventType === "MIGRASI_MASUK" ? (
                  <MigrationRegionFields
                    direction="asal"
                    value={eventDetails}
                    onChange={(region) => setEventDetails((current) => ({ ...current, ...region }))}
                  />
                ) : null}
                {eventType === "KELAHIRAN" ? (
                  <>
                    <label className="text-sm font-medium text-slate-700">Tempat Lahir *<input required value={eventDetails.tempatLahir} onChange={(event) => setEventDetails((current) => ({ ...current, tempatLahir: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label>
                    <label className="text-sm font-medium text-slate-700">Pilih Ibu dari Keluarga<select value={motherId} onChange={(event) => {
                      const nextId = event.target.value;
                      const mother = familyMembers.find((member) => member.id === nextId);
                      setMotherId(nextId);
                      if (mother) {
                        setEventDetails((current) => ({ ...current, nikIbu: mother.nik ?? "", namaIbu: mother.nama ?? "" }));
                      }
                    }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="">-- pilih atau isi manual --</option>{familyMembers.filter((member) => member.jk === "P" || member.jk === "Perempuan").map((member) => <option key={member.id} value={member.id}>{member.nama} — {member.nik}</option>)}</select></label>
                    <label className="text-sm font-medium text-slate-700">Nama Ibu *<input required value={eventDetails.namaIbu} onChange={(event) => setEventDetails((current) => ({ ...current, namaIbu: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label>
                    <label className="text-sm font-medium text-slate-700">NIK Ibu *<input required inputMode="numeric" maxLength={16} value={eventDetails.nikIbu} onChange={(event) => setEventDetails((current) => ({ ...current, nikIbu: event.target.value.replace(/\D/g, "").slice(0, 16) }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label>
                    <label className="text-sm font-medium text-slate-700">Anak Ke-*<input required type="number" min={1} value={eventDetails.anakKe} onChange={(event) => setEventDetails((current) => ({ ...current, anakKe: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label>
                  </>
                ) : null}
                <label className="text-sm font-medium text-slate-700">Nomor Dokumen Pendukung<input value={eventDetails.nomorDokumen} onChange={(event) => setEventDetails((current) => ({ ...current, nomorDokumen: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Keterangan<input value={eventDetails.keterangan} onChange={(event) => setEventDetails((current) => ({ ...current, keterangan: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label>
              </div>
              {eventType === "MIGRASI_MASUK" && !eventAccepted ? (
                <div className="mt-5 flex justify-end border-t border-sky-200 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      const complete =
                        Boolean(eventDetails.tanggal) &&
                        [eventDetails.desaKelurahan, eventDetails.kecamatan, eventDetails.kabupatenKota, eventDetails.provinsi]
                          .every((value) => value.trim());
                      if (!complete) {
                        setGeneralError("Lengkapi tanggal dan seluruh struktur wilayah asal terlebih dahulu.");
                        return;
                      }
                      setGeneralError(null);
                      setEventAccepted(true);
                    }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white"
                  >
                    Selanjutnya ke Pendataan Keluarga <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}
          {eventType !== "MIGRASI_MASUK" || eventAccepted ? (
            <>
              {isHead ? (
                <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Pendataan Keluarga Baru</h2>
                  </div>
                  <label className="text-xs font-semibold text-slate-600">Jumlah anggota selain kepala
                    <input type="number" min="0" max="30" value={extraMembers.length} onChange={(event) => setMemberCount(Number(event.target.value))} className="mt-1 block w-32 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                </div>
              ) : null}
              {isHead ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {[record, ...extraMembers].map((person, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedPerson(index)}
                      className={clsx("shrink-0 rounded-xl border px-4 py-3 text-left", selectedPerson === index ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white")}
                    >
                      <span className="block text-xs font-semibold text-indigo-600">{index === 0 ? "Kepala Keluarga" : `Anggota ${index}`}</span>
                      <span className="mt-0.5 block text-sm font-medium text-slate-800">{person.nama || "Belum diisi"}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <SurveyEditor
                key={isHead ? `new-family-${selectedPerson}` : "new-member"}
                role={editorRole}
                value={editorValue}
                onChange={(next) => {
                  if (editingHead) setRecord(next);
                  else setExtraMembers((current) => current.map((member, index) => index === selectedPerson - 1 ? next : member));
                }}
                errors={currentErrors}
                idPrefix={isHead ? `new-family-${selectedPerson}` : "new-member"}
                allowedGroups={editingHead && isHead ? undefined : ["identitas_keluarga"]}
                hiddenFields={
                  eventType === "KELAHIRAN"
                    ? ["status_kawin", "agama", "suku", "status_dalam_keluarga"]
                    : undefined
                }
                optionalFields={eventType === "KELAHIRAN" ? ["nik"] : undefined}
              />
              <div className="flex justify-end border-t border-slate-200 pt-5">
                <button type="button" disabled={submitting} onClick={submit} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"><Check className="h-4 w-4" /> {submitting ? "Menyimpan..." : isHead ? "Simpan Keluarga Baru" : "Simpan Aspek 1"}</button>
              </div>
            </>
          ) : null}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">Pilih keluarga atau bangunan di atas untuk membuka formulir.</div>
      )}
    </div>
  );
}
