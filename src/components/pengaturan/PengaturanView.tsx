"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ImageUp, Landmark, Trash2 } from "lucide-react";
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

export function PengaturanView() {
  const canWrite = useCanWrite();
  const [settings, setSettings] = useState<SuratSettings>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [previewId, setPreviewId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState("");

  useEffect(() => {
    fetch("/api/pengaturan").then((r) => r.json()).then((j) => setSettings(j.data ?? {})).catch(() => {});
    fetch("/api/surat/template").then((r) => r.json()).then((j) => {
      setTemplates(j.data ?? []);
      if (j.data?.[0]) setPreviewId(j.data[0].id);
    }).catch(() => {});
  }, []);

  const previewTemplate = useMemo(
    () => templates.find((t) => t.id === previewId) ?? templates[0],
    [templates, previewId]
  );

  const previewBody = useMemo(() => {
    if (!previewTemplate) return "";
    return previewTemplate.isi
      .replace(/\{\{nama_desa\}\}/g, settings.kopBaris3 || "Desa")
      .replace(/\{\{keperluan\}\}/g, "Keperluan Contoh");
  }, [previewTemplate, settings.kopBaris3]);

  function setField(key: keyof SuratSettings, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/pengaturan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  async function replaceLogo(file: File, input: HTMLInputElement) {
    setLogoError("");
    if (!["image/png", "image/jpeg", "image/svg+xml"].includes(file.type)) {
      setLogoError("Logo harus berformat PNG, JPG, atau SVG.");
      input.value = "";
      return;
    }
    if (file.size > 2_000_000) {
      setLogoError("Ukuran logo maksimal 2 MB.");
      input.value = "";
      return;
    }
    setLogoBusy(true);
    try {
      const media = await uploadMedia(file, "LOGO_DESA");
      const response = await fetch("/api/pengaturan/logo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: media.id }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Logo gagal disimpan.");
      setSettings(json.data ?? {});
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : "Logo gagal disimpan.");
    } finally {
      setLogoBusy(false);
      input.value = "";
    }
  }

  async function removeLogo() {
    setLogoBusy(true);
    setLogoError("");
    try {
      const response = await fetch("/api/pengaturan/logo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: null }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Logo gagal dihapus.");
      setSettings(json.data ?? {});
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : "Logo gagal dihapus.");
    } finally {
      setLogoBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h2 className="text-lg font-bold text-slate-900">Identitas Desa</h2>
          <p className="mt-1 text-sm text-slate-500">Logo ini digunakan otomatis pada pratinjau, hasil cetak, dan PDF surat yang diterbitkan berikutnya.</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {settings.logoUrl ? (
                <Image src={settings.logoUrl} alt="Logo desa saat ini" width={112} height={112} unoptimized className="h-full w-full object-contain p-2" />
              ) : (
                <div className="text-center text-xs text-slate-400"><Landmark className="mx-auto mb-1 h-9 w-9" />Belum ada logo</div>
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <p className="text-xs leading-relaxed text-slate-500">PNG, JPG, atau SVG aman. Maksimal 2 MB. Gunakan gambar tegak atau persegi agar kop tetap proporsional.</p>
              {settings.logoUpdatedAt ? <p className="text-xs text-slate-500">Diperbarui {new Date(settings.logoUpdatedAt).toLocaleString("id-ID")}</p> : null}
              {canWrite ? (
                <div className="flex flex-wrap gap-2">
                  <label className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 ${logoBusy ? "pointer-events-none opacity-60" : ""}`}>
                    <ImageUp className="h-4 w-4" /> {logoBusy ? "Memproses..." : settings.logoUrl ? "Ganti Logo" : "Unggah Logo"}
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                      className="sr-only"
                      disabled={logoBusy}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (file) void replaceLogo(file, event.currentTarget);
                      }}
                    />
                  </label>
                  {settings.logoUrl ? (
                    <button type="button" disabled={logoBusy} onClick={removeLogo} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60">
                      <Trash2 className="h-4 w-4" /> Hapus
                    </button>
                  ) : null}
                </div>
              ) : <p className="text-xs text-slate-400">Mode lihat. Penggantian logo hanya untuk operator.</p>}
              {logoError ? <p role="alert" className="text-sm text-rose-600">{logoError}</p> : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h2 className="text-lg font-bold text-slate-900">Pengaturan Umum &amp; Kop Surat</h2>
          <div className="mt-4 space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-slate-600">{f.label}</label>
                {f.textarea ? (
                  <textarea
                    value={(settings[f.key] as string) ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <input
                    value={(settings[f.key] as string) ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>
            ))}
            <div className="flex items-center justify-end gap-3">
              {saved && <span className="text-sm font-medium text-emerald-600">Tersimpan.</span>}
              {!canWrite && <span className="text-xs text-slate-400">Mode lihat (pemerintah desa).</span>}
              {canWrite && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={save}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Simpan Pengaturan"}
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h2 className="text-lg font-bold text-slate-900">Manajemen Template Surat</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {templates.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{t.nama}</p>
                  <p className="text-xs text-slate-500">Kode: {t.kode} / Kategori: {t.kategori}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewId(t.id)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Pratinjau
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="text-lg font-bold text-slate-900">Pratinjau Template Surat</h2>
        <select
          value={previewId}
          onChange={(e) => setPreviewId(e.target.value)}
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.nama}</option>
          ))}
        </select>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
          {previewTemplate && (
            <SuratPreview
              settings={settings}
              templateNama={previewTemplate.nama}
              nomor={`XXX/${previewTemplate.kode}/${previewTemplate.kategori}/I/2026 (Contoh)`}
              body={previewBody}
              warga={DUMMY_WARGA}
              tanggal={new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
            />
          )}
        </div>
      </section>
    </div>
  );
}
