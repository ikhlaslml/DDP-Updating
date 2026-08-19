"use client";

import { useEffect, useMemo, useState } from "react";
import { SuratPreview, type SuratSettings, type Warga } from "@/components/surat/SuratPreview";
import { useCanWrite } from "@/components/providers/AuthInfo";

type Template = { id: string; nama: string; kode: string; kategori: string; isi: string };
type Row = Warga & { id: string };
type SourceEvent = { id: string; jenis: string; tanggal: string; nama: string | null; nik: string | null };

export function LayananSuratView({ eventId }: { eventId?: string }) {
  const canWrite = useCanWrite();
  const [settings, setSettings] = useState<SuratSettings>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [keperluan, setKeperluan] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [nomor, setNomor] = useState<string | null>(null);
  const [sourceEvent, setSourceEvent] = useState<SourceEvent | null>(null);

  useEffect(() => {
    fetch("/api/pengaturan").then((r) => r.json()).then((j) => setSettings(j.data ?? {})).catch(() => {});
    fetch("/api/surat/template").then((r) => r.json()).then((j) => {
      setTemplates(j.data ?? []);
      if (j.data?.[0]) setTemplateId(j.data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!eventId || templates.length === 0) return;
    fetch(`/api/peristiwa?id=${encodeURIComponent(eventId)}`)
      .then((response) => response.json())
      .then((json) => {
        if (!json.data?.event || !json.data?.resident) return;
        setSourceEvent(json.data.event);
        setSelected(json.data.resident as Row);
        setQuery(json.data.event.nama ?? json.data.event.nik ?? "");
        setKeperluan(`Administrasi ${String(json.data.event.jenis).replaceAll("_", " ").toLocaleLowerCase("id-ID")}`);
        const keyword = json.data.event.jenis === "KELAHIRAN" ? "kelahiran" : json.data.event.jenis === "KEMATIAN" ? "kematian" : json.data.event.jenis === "MIGRASI_KELUAR" ? "pindah" : "domisili";
        const matching = templates.find((item) => item.nama.toLocaleLowerCase("id-ID").includes(keyword));
        if (matching) setTemplateId(matching.id);
      })
      .catch(() => {});
  }, [eventId, templates]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/penduduk?q=${encodeURIComponent(query)}&pageSize=8`);
      const json = await res.json();
      setResults(json.data ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const template = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId]);

  const body = useMemo(() => {
    if (!template) return "";
    return template.isi
      .replace(/\{\{nama_desa\}\}/g, settings.kopBaris3 || "Desa")
      .replace(/\{\{keperluan\}\}/g, keperluan || "________");
  }, [template, settings.kopBaris3, keperluan]);

  async function issue() {
    if (!selected || !template) return;
    setIssuing(true);
    const res = await fetch("/api/surat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: template.id,
        pendudukId: selected.id,
        namaWarga: selected.nama,
        nik: selected.nik,
        keperluan,
        peristiwaId: sourceEvent?.id,
      }),
    });
    const json = await res.json();
    setIssuing(false);
    if (res.ok) setNomor(json.data.nomor);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Step 1 */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="text-base font-bold text-slate-900">1. Pilih Penduduk</h2>
        {sourceEvent ? <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-800"><strong>Terhubung ke peristiwa {sourceEvent.jenis.replaceAll("_", " ")}.</strong> Data warga dan jenis surat sudah diisi otomatis. Anda tetap dapat menyesuaikannya sebelum menerbitkan.</div> : null}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 2) setResults([]);
          }}
          placeholder="Cari Nama atau NIK..."
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <ul className="mt-3 max-h-72 divide-y divide-slate-100 overflow-y-auto">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => { setSelected(r); setSourceEvent(null); setNomor(null); }}
                className={`flex w-full items-center justify-between px-2 py-2 text-left text-sm hover:bg-slate-50 ${selected?.id === r.id ? "bg-indigo-50" : ""}`}
              >
                <span className="font-medium text-slate-800">{r.nama}</span>
                <span className="text-xs text-slate-500">{r.nik}</span>
              </button>
            </li>
          ))}
          {query.trim().length >= 2 && results.length === 0 && (
            <li className="px-2 py-3 text-sm text-slate-400">Tidak ditemukan.</li>
          )}
        </ul>
      </section>

      {/* Step 2 */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="text-base font-bold text-slate-900">2. Buat Surat</h2>
        {!selected ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-16 text-center text-sm text-slate-400">
            Silakan cari dan pilih penduduk dari kolom di sebelah kiri untuk memulai.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-600">
              Warga terpilih: <strong>{selected.nama}</strong> ({selected.nik})
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-600">Jenis Surat</label>
              <select
                value={templateId}
                onChange={(e) => { setTemplateId(e.target.value); setNomor(null); }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Keperluan</label>
              <input
                value={keperluan}
                onChange={(e) => { setKeperluan(e.target.value); setNomor(null); }}
                placeholder="mis. melamar pekerjaan"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              {canWrite ? (
                <button
                  type="button"
                  disabled={issuing}
                  onClick={issue}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {issuing ? "Menerbitkan..." : nomor ? "Terbitkan Ulang" : "Terbitkan Surat"}
                </button>
              ) : (
                <span className="text-xs text-slate-400">Penerbitan surat hanya untuk operator.</span>
              )}
              {nomor && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cetak
                </button>
              )}
            </div>
            {nomor && <p className="text-sm font-medium text-emerald-600">Surat diterbitkan. Nomor: {nomor}</p>}
          </div>
        )}
      </section>

      {/* Printable preview */}
      {selected && template && nomor && (
        <div className="lg:col-span-2">
          <div className="surat-print overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <SuratPreview
              settings={settings}
              templateNama={template.nama}
              nomor={nomor}
              body={body}
              warga={selected}
              tanggal={new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
