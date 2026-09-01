"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ImageUp, Landmark, PenLine, Save, Trash2 } from "lucide-react";
import { SuratPreview, type SuratSettings } from "@/components/surat/SuratPreview";
import { useCanWrite } from "@/components/providers/AuthInfo";
import { uploadMedia } from "@/lib/client-media";

type Template = { id: string; nama: string; kode: string; kategori: string; isi: string };

const FIELDS: { key: keyof SuratSettings; label: string; textarea?: boolean }[] = [
  { key: "namaKepala", label: "Nama Kepala Desa" },
  { key: "kopBaris1", label: "Kop Baris 1" },
  { key: "kopBaris2", label: "Kop Baris 2" },
  { key: "kopBaris3", label: "Kop Baris 3 (Nama Desa)" },
  { key: "kopBaris4", label: "Kop Baris 4 (Alamat)" },
  { key: "penutup", label: "Paragraf Penutup Umum", textarea: true },
  { key: "disclaimer", label: "Penafian Digital Umum", textarea: true },
];

const DUMMY_WARGA = {
  nama: "John Doe (Contoh)",
  nik: "3201010101900001",
  jk: "L",
  tgl_lahir: "1990-01-15",
  agama: "Islam",
  status_kawin: "Kawin",
  kerja_profesi: "Wiraswasta",
  alamat: "Jl. Merdeka No. 1",
};

function imageError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function PengaturanView() {
  const canWrite = useCanWrite();
  const [settings, setSettings] = useState<SuratSettings>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [previewId, setPreviewId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [signatureBusy, setSignatureBusy] = useState(false);
  const [signatureError, setSignatureError] = useState("");
  const [templateBusyId, setTemplateBusyId] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState("");

  useEffect(() => {
    fetch("/api/pengaturan").then((response) => response.json()).then((json) => setSettings(json.data ?? {})).catch(() => {});
    fetch("/api/surat/template").then((response) => response.json()).then((json) => {
      setTemplates(json.data ?? []);
      if (json.data?.[0]) setPreviewId(json.data[0].id);
    }).catch(() => {});
  }, []);

  const previewTemplate = useMemo(() => templates.find((template) => template.id === previewId) ?? templates[0], [templates, previewId]);
  const previewBody = useMemo(() => previewTemplate?.isi
    .replace(/\{\{nama_desa\}\}/g, settings.kopBaris3 || "Desa")
    .replace(/\{\{keperluan\}\}/g, "Keperluan Contoh") ?? "", [previewTemplate, settings.kopBaris3]);

  function setField(key: keyof SuratSettings, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setSettingsError("");
    try {
      const response = await fetch("/api/pengaturan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Identitas surat gagal disimpan.");
      setSettings(json.data ?? {});
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      setSettingsError(imageError(error, "Identitas surat gagal disimpan."));
    } finally {
      setSaving(false);
    }
  }

  async function replaceLogo(file: File, input: HTMLInputElement) {
    setLogoError("");
    if (!["image/png", "image/jpeg", "image/svg+xml"].includes(file.type)) { setLogoError("Logo harus berformat PNG, JPG, atau SVG."); input.value = ""; return; }
    if (file.size > 2_000_000) { setLogoError("Ukuran logo maksimal 2 MB."); input.value = ""; return; }
    setLogoBusy(true);
    try {
      const media = await uploadMedia(file, "LOGO_DESA");
      const response = await fetch("/api/pengaturan/logo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetId: media.id }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Logo gagal disimpan.");
      setSettings(json.data ?? {});
    } catch (error) {
      setLogoError(imageError(error, "Logo gagal disimpan."));
    } finally {
      setLogoBusy(false);
      input.value = "";
    }
  }

  async function removeLogo() {
    setLogoBusy(true);
    setLogoError("");
    try {
      const response = await fetch("/api/pengaturan/logo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetId: null }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Logo gagal dihapus.");
      setSettings(json.data ?? {});
    } catch (error) {
      setLogoError(imageError(error, "Logo gagal dihapus."));
    } finally {
      setLogoBusy(false);
    }
  }

  async function replaceSignature(file: File, input: HTMLInputElement) {
    setSignatureError("");
    if (!["image/png", "image/jpeg"].includes(file.type)) { setSignatureError("Tanda tangan harus berformat PNG, JPG, atau JPEG."); input.value = ""; return; }
    if (file.size > 1_000_000) { setSignatureError("Ukuran tanda tangan maksimal 1 MB."); input.value = ""; return; }
    setSignatureBusy(true);
    try {
      const media = await uploadMedia(file, "TANDA_TANGAN");
      const response = await fetch("/api/pengaturan/tanda-tangan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetId: media.id }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Tanda tangan gagal disimpan.");
      setSettings(json.data ?? {});
    } catch (error) {
      setSignatureError(imageError(error, "Tanda tangan gagal disimpan."));
    } finally {
      setSignatureBusy(false);
      input.value = "";
    }
  }

  async function removeSignature() {
    setSignatureBusy(true);
    setSignatureError("");
    try {
      const response = await fetch("/api/pengaturan/tanda-tangan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetId: null }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Tanda tangan gagal dihapus.");
      setSettings(json.data ?? {});
    } catch (error) {
      setSignatureError(imageError(error, "Tanda tangan gagal dihapus."));
    } finally {
      setSignatureBusy(false);
    }
  }

  function setTemplateField(id: string, field: "kode" | "kategori", value: string) {
    setTemplates((current) => current.map((template) => template.id === id ? { ...template, [field]: value } : template));
    setTemplateError("");
  }

  async function saveTemplate(template: Template) {
    setTemplateBusyId(template.id);
    setTemplateError("");
    try {
      const response = await fetch("/api/surat/template", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: template.id, kode: template.kode, kategori: template.kategori }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Kode surat gagal disimpan.");
      setTemplates((current) => current.map((item) => item.id === template.id ? json.data : item));
    } catch (error) {
      setTemplateError(imageError(error, "Kode surat gagal disimpan."));
    } finally {
      setTemplateBusyId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h2 className="text-lg font-bold text-slate-900">Identitas Desa</h2>
          <p className="mt-1 text-sm text-slate-500">Logo ini digunakan otomatis pada pratinjau, hasil cetak, dan PDF surat yang diterbitkan berikutnya.</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="mx-auto flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:mx-0">{settings.logoUrl ? <Image src={settings.logoUrl} alt="Logo desa saat ini" width={112} height={112} unoptimized className="h-full w-full object-contain p-2" /> : <div className="text-center text-xs text-slate-400"><Landmark className="mx-auto mb-1 h-9 w-9" />Belum ada logo</div>}</div>
            <div className="min-w-0 space-y-2"><p className="text-xs leading-relaxed text-slate-500">PNG, JPG, atau SVG aman. Maksimal 2 MB. Gunakan gambar tegak atau persegi agar kop tetap proporsional.</p>{settings.logoUpdatedAt ? <p className="text-xs text-slate-500">Diperbarui {new Date(settings.logoUpdatedAt).toLocaleString("id-ID")}</p> : null}{canWrite ? <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"><label className={`inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 sm:w-auto ${logoBusy ? "pointer-events-none opacity-60" : ""}`}><ImageUp className="h-4 w-4" /> {logoBusy ? "Memproses..." : settings.logoUrl ? "Ganti Logo" : "Unggah Logo"}<input type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" className="sr-only" disabled={logoBusy} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void replaceLogo(file, event.currentTarget); }} /></label>{settings.logoUrl ? <button type="button" disabled={logoBusy} onClick={removeLogo} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60 sm:w-auto"><Trash2 className="h-4 w-4" /> Hapus</button> : null}</div> : <p className="text-xs text-slate-400">Mode lihat. Penggantian logo hanya untuk operator.</p>}{logoError ? <p role="alert" className="text-sm text-rose-600">{logoError}</p> : null}</div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h2 className="text-lg font-bold text-slate-900">Tanda Tangan Kepala Desa</h2>
          <p className="mt-1 text-sm text-slate-500">Gambar tanda tangan ditampilkan pada surat yang diterbitkan setelahnya. Surat lama tetap memakai data yang tersimpan saat diterbitkan.</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center"><div className="mx-auto flex h-24 w-44 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 sm:mx-0">{settings.tandaTanganUrl ? <Image src={settings.tandaTanganUrl} alt="Tanda tangan kepala desa" width={176} height={96} unoptimized className="h-full w-full object-contain p-2" /> : <div className="text-center text-xs text-slate-400"><PenLine className="mx-auto mb-1 h-8 w-8" />Belum ada tanda tangan</div>}</div><div className="min-w-0 space-y-2"><p className="text-xs leading-relaxed text-slate-500">PNG, JPG, atau JPEG. Maksimal 1 MB. Gunakan gambar berlatar transparan atau putih agar jelas di surat.</p>{settings.tandaTanganUpdatedAt ? <p className="text-xs text-slate-500">Diperbarui {new Date(settings.tandaTanganUpdatedAt).toLocaleString("id-ID")}</p> : null}{canWrite ? <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"><label className={`inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 sm:w-auto ${signatureBusy ? "pointer-events-none opacity-60" : ""}`}><ImageUp className="h-4 w-4" /> {signatureBusy ? "Memproses..." : settings.tandaTanganUrl ? "Ganti Tanda Tangan" : "Unggah Tanda Tangan"}<input type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" className="sr-only" disabled={signatureBusy} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void replaceSignature(file, event.currentTarget); }} /></label>{settings.tandaTanganUrl ? <button type="button" disabled={signatureBusy} onClick={removeSignature} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60 sm:w-auto"><Trash2 className="h-4 w-4" /> Hapus</button> : null}</div> : <p className="text-xs text-slate-400">Mode lihat. Penggantian tanda tangan hanya untuk operator.</p>}{signatureError ? <p role="alert" className="text-sm text-rose-600">{signatureError}</p> : null}</div></div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h2 className="text-lg font-bold text-slate-900">Kop Surat &amp; Penandatangan</h2>
          <p className="mt-1 text-sm text-slate-500">Informasi ini digunakan otomatis pada setiap surat yang diterbitkan desa.</p>
          <div className="mt-4 space-y-4">{FIELDS.map((field) => <div key={field.key}><label className="block text-xs font-medium text-slate-600">{field.label}</label>{field.textarea ? <textarea value={(settings[field.key] as string) ?? ""} onChange={(event) => setField(field.key, event.target.value)} rows={2} disabled={!canWrite} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50" /> : <input value={(settings[field.key] as string) ?? ""} onChange={(event) => setField(field.key, event.target.value)} disabled={!canWrite} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50" />}</div>)}{settingsError ? <p role="alert" className="text-sm text-rose-600">{settingsError}</p> : null}<div className="flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">{saved ? <span className="text-sm font-medium text-emerald-600">Tersimpan.</span> : null}{!canWrite ? <span className="text-xs text-slate-400">Mode lihat (pemerintah desa).</span> : null}{canWrite ? <button type="button" disabled={saving} onClick={() => void save()} className="min-h-11 w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 sm:w-auto">{saving ? "Menyimpan..." : "Simpan Identitas Surat"}</button> : null}</div></div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h2 className="text-lg font-bold text-slate-900">Kode Kategori Surat</h2>
          <p className="mt-1 text-sm text-slate-500">Perubahan kode hanya dipakai pada surat yang diterbitkan setelah disimpan. Nomor surat yang sudah terbit tidak diubah.</p>
          <ul className="mt-4 divide-y divide-slate-100">{templates.map((template) => <li key={template.id} className="py-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div className="min-w-0 lg:flex-1"><p className="text-sm font-semibold text-slate-800">{template.nama}</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="text-xs font-medium text-slate-600">Kode<input value={template.kode} disabled={!canWrite} onChange={(event) => setTemplateField(template.id, "kode", event.target.value)} placeholder="Contoh: 470" className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50" /></label><label className="text-xs font-medium text-slate-600">Kategori<input value={template.kategori} disabled={!canWrite} onChange={(event) => setTemplateField(template.id, "kategori", event.target.value)} placeholder="Contoh: PEM" className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50" /></label></div></div><div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => setPreviewId(template.id)} className="min-h-10 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Pratinjau</button>{canWrite ? <button type="button" disabled={templateBusyId === template.id} onClick={() => void saveTemplate(template)} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"><Save className="h-3.5 w-3.5" /> {templateBusyId === template.id ? "Menyimpan..." : "Simpan Kode"}</button> : null}</div></div></li>)}</ul>{templateError ? <p role="alert" className="mt-3 text-sm text-rose-600">{templateError}</p> : null}</section>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="text-lg font-bold text-slate-900">Pratinjau Template Surat</h2>
        <select value={previewId} onChange={(event) => setPreviewId(event.target.value)} className="mt-3 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">{templates.map((template) => <option key={template.id} value={template.id}>{template.nama}</option>)}</select>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3">{previewTemplate ? <SuratPreview settings={settings} templateNama={previewTemplate.nama} nomor={`XXX/${previewTemplate.kode}/${previewTemplate.kategori}/I/2026 (Contoh)`} body={previewBody} warga={DUMMY_WARGA} tanggal={new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })} /> : <p className="py-10 text-center text-sm text-slate-500">Belum ada template surat.</p>}</div>
      </section>
    </div>
  );
}
