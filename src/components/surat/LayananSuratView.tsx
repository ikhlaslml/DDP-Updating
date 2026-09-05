"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Eye, FileClock, FilePlus2, Printer, X } from "lucide-react";
import { SuratPreview, type SuratSettings, type Warga } from "@/components/surat/SuratPreview";
import { useCanWrite } from "@/components/providers/AuthInfo";
import { SuratHistory } from "@/components/surat/SuratHistory";

type Template = { id: string; nama: string; kode: string; kategori: string; isi: string };
type Row = Warga & { id: string };
type SourceEvent = { id: string; jenis: string; tanggal: string; nama: string | null; nik: string | null };
type IssuedDocument = {
  letter: { id: string; nomor: string; createdAt: string };
  settings: SuratSettings;
  warga: Warga;
  body: string;
  templateNama: string;
};

export function LayananSuratView({ eventId, initialTab = "terbitkan" }: { eventId?: string; initialTab?: "terbitkan" | "riwayat" }) {
  const canWrite = useCanWrite();
  const [tab, setTab] = useState<"terbitkan" | "riwayat">(eventId ? "terbitkan" : initialTab);
  const [settings, setSettings] = useState<SuratSettings>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [keperluan, setKeperluan] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [nomor, setNomor] = useState<string | null>(null);
  const [suratId, setSuratId] = useState<string | null>(null);
  const [sourceEvent, setSourceEvent] = useState<SourceEvent | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [validated, setValidated] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issuedDocument, setIssuedDocument] = useState<IssuedDocument | null>(null);

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
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/penduduk?q=${encodeURIComponent(query)}&pageSize=8`);
        const json = await res.json();
        setResults(json.data ?? []);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const template = useMemo(() => templates.find((item) => item.id === templateId), [templates, templateId]);
  const body = useMemo(() => {
    if (!template) return "";
    return template.isi
      .replace(/\{\{nama_desa\}\}/g, settings.kopBaris3 || "Desa")
      .replace(/\{\{keperluan\}\}/g, keperluan || "________");
  }, [template, settings.kopBaris3, keperluan]);

  function resetIssueState() {
    setNomor(null);
    setSuratId(null);
    setPreviewOpen(false);
    setValidated(false);
    setIssueError(null);
    setIssuedDocument(null);
  }

  function changeTab(next: "terbitkan" | "riwayat") {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "riwayat") url.searchParams.set("tab", "riwayat");
    else url.searchParams.delete("tab");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function openPreview() {
    setIssueError(null);
    if (!selected) {
      setIssueError("Pilih warga yang akan dibuatkan surat.");
      return;
    }
    if (!template) {
      setIssueError("Pilih jenis surat terlebih dahulu.");
      return;
    }
    if (!keperluan.trim()) {
      setIssueError("Keperluan surat wajib diisi sebelum pratinjau.");
      return;
    }
    setPreviewOpen(true);
    setValidated(false);
  }

  async function loadIssuedDocument(id: string) {
    const response = await fetch(`/api/surat/${id}`);
    const json = await response.json().catch(() => ({}));
    if (response.ok && json.data) setIssuedDocument(json.data as IssuedDocument);
  }

  async function issue() {
    if (!selected || !template || !validated) {
      setIssueError("Buka pratinjau dan tandai surat sudah diperiksa sebelum menerbitkan.");
      return;
    }
    setIssuing(true);
    setIssueError(null);
    try {
      const res = await fetch("/api/surat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          pendudukId: selected.id,
          namaWarga: selected.nama,
          nik: selected.nik,
          keperluan: keperluan.trim(),
          peristiwaId: sourceEvent?.id,
          confirmed: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Surat gagal diterbitkan.");
      setNomor(json.data.nomor);
      setSuratId(json.data.id);
      setPreviewOpen(false);
      setValidated(false);
      await loadIssuedDocument(json.data.id);
    } catch (error) {
      setIssueError(error instanceof Error ? error.message : "Surat gagal diterbitkan.");
    } finally {
      setIssuing(false);
    }
  }

  const previewDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  const finalDate = issuedDocument?.letter.createdAt
    ? new Date(issuedDocument.letter.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
    : previewDate;

  return (
    <div className="space-y-5">
      <div className="inline-flex w-full gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:w-auto">
        <button type="button" onClick={() => changeTab("terbitkan")} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold sm:flex-none ${tab === "terbitkan" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}><FilePlus2 className="h-4 w-4" /> Terbitkan Surat</button>
        <button type="button" onClick={() => changeTab("riwayat")} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold sm:flex-none ${tab === "riwayat" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}><FileClock className="h-4 w-4" /> Riwayat Surat</button>
      </div>

      {tab === "terbitkan" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
            <h2 className="text-base font-bold text-slate-900">1. Pilih Warga</h2>
            {sourceEvent ? <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">Terhubung ke peristiwa {sourceEvent.jenis.replaceAll("_", " ")}</div> : null}
            <input value={query} onChange={(event) => { setQuery(event.target.value); if (event.target.value.trim().length < 2) setResults([]); }} placeholder="Cari nama atau NIK..." className="mt-3 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <ul className="mt-3 max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {results.map((row) => <li key={row.id}><button type="button" onClick={() => { setSelected(row); setSourceEvent(null); resetIssueState(); }} className={`flex min-h-12 w-full flex-col items-start gap-1 px-2 py-2 text-left text-sm hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between ${selected?.id === row.id ? "bg-indigo-50" : ""}`}><span className="font-medium text-slate-800">{row.nama}</span><span className="break-all text-xs text-slate-500">{row.nik}</span></button></li>)}
              {query.trim().length >= 2 && results.length === 0 ? <li className="px-2 py-3 text-sm text-slate-400">Tidak ditemukan.</li> : null}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
            <h2 className="text-base font-bold text-slate-900">2. Isi Surat</h2>
            {!selected ? <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-400 sm:py-16">Silakan cari dan pilih warga dari kolom di sebelah kiri untuk memulai.</div> : (
              <div className="mt-4 space-y-3">
                <p className="break-words text-sm text-slate-600">Warga terpilih: <strong>{selected.nama}</strong> <span className="break-all">({selected.nik})</span></p>
                <div><label className="block text-xs font-medium text-slate-600">Jenis Surat</label><select value={templateId} onChange={(event) => { setTemplateId(event.target.value); resetIssueState(); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">{templates.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-slate-600">Keperluan <span className="text-rose-600">*</span></label><input value={keperluan} onChange={(event) => { setKeperluan(event.target.value); resetIssueState(); }} placeholder="Contoh: melamar pekerjaan" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                {issueError ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{issueError}</p> : null}
                <button type="button" onClick={openPreview} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 sm:w-auto"><Eye className="h-4 w-4" /> Pratinjau Surat</button>
                {!canWrite ? <p className="text-xs text-slate-400">Mode lihat: penerbitan surat hanya untuk operator.</p> : null}
              </div>
            )}
          </section>

          {previewOpen && selected && template ? <section className="lg:col-span-2 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-bold text-slate-900">3. Pratinjau dan Periksa</h2></div><button type="button" onClick={() => { setPreviewOpen(false); setValidated(false); }} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><X className="h-4 w-4" /> Batal</button></div>
            <div className="surat-print overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:p-4"><SuratPreview settings={settings} templateNama={template.nama} nomor="Nomor akan dibuat saat diterbitkan" body={body} warga={selected} tanggal={previewDate} /></div>
            {canWrite ? <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={validated} onChange={(event) => setValidated(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /> Saya sudah memeriksa isi surat.</label><button type="button" disabled={!validated || issuing} onClick={issue} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> {issuing ? "Menerbitkan..." : "Terbitkan Surat"}</button></div> : null}
          </section> : null}

          {nomor && suratId ? <section className="lg:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-emerald-900">Surat telah diterbitkan</h2><p className="mt-1 text-sm text-emerald-800">Nomor surat: <strong>{nomor}</strong>. Surat ini sudah masuk Riwayat Surat.</p></div><div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => window.open(`/api/surat/${suratId}/pdf?mode=inline`, "_blank", "noopener,noreferrer")} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Printer className="h-4 w-4" /> Cetak PDF</button><a href={`/api/surat/${suratId}/pdf`} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"><Download className="h-4 w-4" /> Unduh PDF</a></div></div>
            <div className="surat-print mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:p-4"><SuratPreview settings={issuedDocument?.settings ?? settings} templateNama={issuedDocument?.templateNama ?? template?.nama ?? "Surat Keterangan"} nomor={issuedDocument?.letter.nomor ?? nomor} body={issuedDocument?.body ?? body} warga={issuedDocument?.warga ?? selected ?? {}} tanggal={finalDate} /></div>
          </section> : null}
        </div>
      ) : <SuratHistory templates={templates} />}
    </div>
  );
}
