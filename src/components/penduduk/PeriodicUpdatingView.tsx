"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import { FieldInput } from "@/components/penduduk/FieldInput";
import { useCanWrite } from "@/components/providers/AuthInfo";
import { fieldLabel } from "@/lib/field-labels";
import { KELOMPOK_LABEL, KELOMPOK_ORDER, mapping } from "@/lib/indikator";

type CellStatus = "JATUH_TEMPO" | "MENUNGGU_PENGGABUNGAN" | "TERKINI";
type Cell = {
  field: string;
  value: string;
  status: CellStatus;
  lastUpdated: string;
  dueAt: string;
};
type FamilyRow = {
  nkk: string;
  headId: string;
  namaKepala: string;
  kodeBangunan: number | null;
  dusun: string | null;
  rw: number | null;
  rt: number | null;
  jumlahAnggota: number;
  dueFamilyFields: number;
  dueMemberFields: number;
  waitingFields: number;
  status: CellStatus;
};
type Member = {
  id: string;
  nama: string;
  nik: string;
  role: "HEAD" | "MEMBER";
  statusDalamKeluarga: string;
  cells: Cell[];
};
type FamilyDetail = FamilyRow & {
  familyCells: Cell[];
  members: Member[];
};
type ListResponse = {
  data: FamilyRow[];
  summary?: { total: number; dueFamilies: number; waitingFamilies: number };
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  facets: { dusun: string[]; rw: number[]; rt: number[] };
};

const STATUS_VIEW = {
  JATUH_TEMPO: {
    label: "Jatuh tempo",
    className: "border-red-200 bg-red-50 text-red-800",
    Icon: AlertCircle,
  },
  MENUNGGU_PENGGABUNGAN: {
    label: "Menunggu diterapkan",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    Icon: Clock3,
  },
  TERKINI: {
    label: "Terkini",
    className: "border-slate-200 bg-white text-slate-600",
    Icon: CheckCircle2,
  },
} as const;

function StatusBadge({ status }: { status: CellStatus }) {
  const view = STATUS_VIEW[status];
  return (
    <span
      title={view.label}
      aria-label={`Status: ${view.label}`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${view.className}`}
    >
      <view.Icon className="h-3.5 w-3.5" />
      {view.label}
    </span>
  );
}

function groupCells(cells: Cell[]) {
  const byField = new Map(cells.map((cell) => [cell.field, cell]));
  return KELOMPOK_ORDER.map((group) => ({
    group,
    cells: Object.keys(mapping.kolom)
      .filter((field) => mapping.kolom[field].kelompok === group)
      .flatMap((field) => (byField.has(field) ? [byField.get(field) as Cell] : [])),
  })).filter((item) => item.cells.length);
}

export function PeriodicUpdatingView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canWrite = useCanWrite();
  const [cycle, setCycle] = useState<"6-bulan" | "1-tahun">(
    searchParams.get("siklus") === "1-tahun" ? "1-tahun" : "6-bulan",
  );
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [status, setStatus] = useState(searchParams.get("status") ?? "SEMUA");
  const [dusun, setDusun] = useState(searchParams.get("dusun") ?? "");
  const [rw, setRw] = useState(searchParams.get("rw") ?? "");
  const [rt, setRt] = useState(searchParams.get("rt") ?? "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [pageSize, setPageSize] = useState(Number(searchParams.get("pageSize")) || 25);
  const [list, setList] = useState<ListResponse | null>(null);
  const [selectedNkk, setSelectedNkk] = useState<string | null>(searchParams.get("nkk"));
  const [detail, setDetail] = useState<FamilyDetail | null>(null);
  const [familyDraft, setFamilyDraft] = useState<Record<string, string>>({});
  const [memberDrafts, setMemberDrafts] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("siklus", cycle);
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (status !== "SEMUA") params.set("status", status);
    if (dusun) params.set("dusun", dusun);
    if (rw) params.set("rw", rw);
    if (rt) params.set("rt", rt);
    if (page !== 1) params.set("page", String(page));
    if (pageSize !== 25) params.set("pageSize", String(pageSize));
    if (selectedNkk) params.set("nkk", selectedNkk);
    window.history.replaceState(null, "", `/penduduk/pembaruan-berkala?${params}`);
  }, [cycle, debouncedSearch, dusun, page, pageSize, rt, rw, selectedNkk, status]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      siklus: cycle,
      page: String(page),
      pageSize: String(pageSize),
      status,
    });
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (dusun) params.set("dusun", dusun);
    if (rw) params.set("rw", rw);
    if (rt) params.set("rt", rt);
    try {
      const response = await fetch(`/api/updating/keluarga?${params}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Daftar keluarga gagal dimuat");
      setList(json);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Daftar keluarga gagal dimuat");
    } finally {
      setLoading(false);
    }
  }, [cycle, debouncedSearch, dusun, page, pageSize, rt, rw, status]);

  const loadDetail = useCallback(async (nkk: string) => {
    setError(null);
    try {
      const response = await fetch(
        `/api/updating/keluarga/${encodeURIComponent(nkk)}?siklus=${cycle}`,
      );
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Detail keluarga gagal dimuat");
      const next = json.data as FamilyDetail;
      setDetail(next);
      setFamilyDraft(Object.fromEntries(next.familyCells.map((cell) => [cell.field, cell.value])));
      setMemberDrafts(
        Object.fromEntries(
          next.members.map((member) => [
            member.id,
            Object.fromEntries(member.cells.map((cell) => [cell.field, cell.value])),
          ]),
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Detail keluarga gagal dimuat");
    }
  }, [cycle]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadList(), 0);
    return () => window.clearTimeout(timer);
  }, [loadList]);

  useEffect(() => {
    if (!selectedNkk) return;
    const timer = window.setTimeout(() => void loadDetail(selectedNkk), 0);
    return () => window.clearTimeout(timer);
  }, [loadDetail, selectedNkk]);

  function changeCycle(next: "6-bulan" | "1-tahun") {
    setCycle(next);
    setPage(1);
    setSelectedNkk(null);
    setDetail(null);
  }

  async function refresh() {
    await Promise.all([loadList(), selectedNkk ? loadDetail(selectedNkk) : Promise.resolve()]);
    window.dispatchEvent(new Event("periodic-updating-changed"));
    router.refresh();
  }

  async function submitStage(
    payload: { scope: "FAMILY" | "PERSON"; nkk?: string; pendudukId?: string; data: Record<string, string> },
  ) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/updating/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, siklus: cycle }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Pembaruan gagal disimpan");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Pembaruan gagal disimpan");
    } finally {
      setSaving(false);
    }
  }

  async function confirmNoChange(
    item: { scope: "FAMILY" | "PERSON"; nkk?: string; pendudukId?: string; fields: string[] },
  ) {
    if (!item.fields.length) return;
    if (!window.confirm(`Tandai ${item.fields.length} isian sebagai tidak berubah?`)) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/updating/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siklus: cycle, items: [item] }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Konfirmasi gagal");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Konfirmasi gagal");
    } finally {
      setSaving(false);
    }
  }

  const familyChanges = useMemo(() => {
    if (!detail) return {};
    return Object.fromEntries(
      detail.familyCells
        .filter((cell) => familyDraft[cell.field] !== cell.value)
        .map((cell) => [cell.field, familyDraft[cell.field] ?? ""]),
    );
  }, [detail, familyDraft]);

  if (selectedNkk && detail) {
    const dueFamily = detail.familyCells.filter((cell) => cell.status === "JATUH_TEMPO");
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setSelectedNkk(null)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Kembali
        </button>
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Siklus {cycle === "6-bulan" ? "6 Bulan" : "1 Tahun"}
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{detail.namaKepala}</h2>
              <p className="mt-1 text-sm text-slate-500">
                No. KK {detail.nkk} · {detail.jumlahAnggota} anggota · {detail.dusun ?? "-"}, RW{" "}
                {detail.rw ?? "-"}/RT {detail.rt ?? "-"}
              </p>
            </div>
            <StatusBadge status={detail.status} />
          </div>
        </section>

        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900">Parameter Tingkat Keluarga</h3>
            </div>
            {canWrite && dueFamily.length ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => confirmNoChange({ scope: "FAMILY", nkk: detail.nkk, fields: dueFamily.map((cell) => cell.field) })}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700"
              >
                Tidak berubah ({dueFamily.length})
              </button>
            ) : null}
          </div>
          <div className="mt-5 space-y-6">
            {groupCells(detail.familyCells).map(({ group, cells }) => (
              <div key={group}>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {KELOMPOK_LABEL[group]}
                </h4>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {cells.map((cell) => (
                    <div key={cell.field} className={`rounded-xl border p-3 ${STATUS_VIEW[cell.status].className}`}>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold">{fieldLabel(cell.field, mapping.kolom[cell.field])}</span>
                        <StatusBadge status={cell.status} />
                      </div>
                      {canWrite ? (
                        <FieldInput
                          name={cell.field}
                          inputId={`family-${cell.field}`}
                          def={mapping.kolom[cell.field]}
                          value={familyDraft[cell.field] ?? ""}
                          onChange={(value) => setFamilyDraft((current) => ({ ...current, [cell.field]: value }))}
                          role="HEAD"
                        />
                      ) : (
                        <p className="text-sm font-medium text-slate-800">{cell.value || "-"}</p>
                      )}
                      {canWrite && cell.status === "JATUH_TEMPO" ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => confirmNoChange({ scope: "FAMILY", nkk: detail.nkk, fields: [cell.field] })}
                          className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700"
                        >
                          Tidak berubah
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {canWrite ? (
            <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={saving || Object.keys(familyChanges).length === 0}
                onClick={() => submitStage({ scope: "FAMILY", nkk: detail.nkk, data: familyChanges })}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Simpan ({Object.keys(familyChanges).length})
              </button>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="font-bold text-slate-900">Parameter Per Anggota</h3>
          </div>
          {detail.members.map((member) => {
            const draft = memberDrafts[member.id] ?? {};
            const changes = Object.fromEntries(
              member.cells
                .filter((cell) => draft[cell.field] !== cell.value)
                .map((cell) => [cell.field, draft[cell.field] ?? ""]),
            );
            const due = member.cells.filter((cell) => cell.status === "JATUH_TEMPO");
            return (
              <article key={member.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900">{member.nama}</h4>
                    <p className="text-xs text-slate-500">NIK {member.nik} · {member.statusDalamKeluarga}</p>
                  </div>
                  {canWrite && due.length ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => confirmNoChange({ scope: "PERSON", pendudukId: member.id, fields: due.map((cell) => cell.field) })}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700"
                    >
                      Tidak berubah ({due.length})
                    </button>
                  ) : null}
                </div>
                {member.cells.length ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {member.cells.map((cell) => (
                      <div key={cell.field} className={`rounded-xl border p-3 ${STATUS_VIEW[cell.status].className}`}>
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold">{fieldLabel(cell.field, mapping.kolom[cell.field])}</span>
                          <StatusBadge status={cell.status} />
                        </div>
                        {canWrite ? (
                          <FieldInput
                            name={cell.field}
                            inputId={`${member.id}-${cell.field}`}
                            def={mapping.kolom[cell.field]}
                            value={draft[cell.field] ?? ""}
                            onChange={(value) =>
                              setMemberDrafts((current) => ({
                                ...current,
                                [member.id]: { ...(current[member.id] ?? {}), [cell.field]: value },
                              }))
                            }
                            role={member.role}
                          />
                        ) : (
                          <p className="text-sm font-medium text-slate-800">{cell.value || "-"}</p>
                        )}
                        {canWrite && cell.status === "JATUH_TEMPO" ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => confirmNoChange({ scope: "PERSON", pendudukId: member.id, fields: [cell.field] })}
                            className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700"
                          >
                            Tidak berubah
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Tidak ada isian per orang pada jadwal ini.</p>
                )}
                {canWrite && member.cells.length ? (
                  <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      disabled={saving || Object.keys(changes).length === 0}
                      onClick={() => submitStage({ scope: "PERSON", pendudukId: member.id, data: changes })}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      Simpan ({Object.keys(changes).length})
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <UsersRound className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pembaruan Berkala Keluarga</h1>
          </div>
        </div>
        <div className="mt-5 flex gap-2 border-b border-slate-200">
          {[
            ["6-bulan", "Siklus 6 Bulan"],
            ["1-tahun", "Siklus 1 Tahun"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => changeCycle(value as "6-bulan" | "1-tahun")}
              className={`border-b-2 px-4 py-3 text-sm font-semibold ${
                cycle === value ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="block text-xs font-semibold text-slate-500 xl:col-span-2">
            Cari
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Nama, NIK, atau No. KK" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </label>
          <label className="block text-xs font-semibold text-slate-500">
            Status
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="SEMUA">Semua status</option>
              <option value="JATUH_TEMPO">Jatuh tempo</option>
              <option value="MENUNGGU_PENGGABUNGAN">Menunggu diterapkan</option>
              <option value="TERKINI">Sudah mutakhir</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-500">
            Dusun
            <select value={dusun} onChange={(event) => { setDusun(event.target.value); setPage(1); }} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Semua dusun</option>
              {list?.facets.dusun.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-500">
            RW
            <select value={rw} onChange={(event) => { setRw(event.target.value); setPage(1); }} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Semua RW</option>
              {list?.facets.rw.map((value) => <option key={value} value={value}>RW {value}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-500">
            RT
            <select value={rt} onChange={(event) => { setRt(event.target.value); setPage(1); }} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Semua RT</option>
              {list?.facets.rt.map((value) => <option key={value} value={value}>RT {value}</option>)}
            </select>
          </label>
        </div>
      </section>

      {list?.summary ? (
        <p className="text-sm text-slate-600">
          <strong className="text-slate-900">{list.summary.dueFamilies}</strong> keluarga jatuh tempo
          {list.summary.waitingFamilies ? ` · ${list.summary.waitingFamilies} menunggu diterapkan` : ""}
          {` · ${list.summary.total} keluarga pada pencarian ini`}
        </p>
      ) : null}

      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3">Keluarga</th>
                <th className="px-4 py-3">Lokasi</th>
                <th className="px-4 py-3">Jatuh tempo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Memuat keluarga...</td></tr>
              ) : !list?.data.length ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Tidak ada keluarga yang sesuai.</td></tr>
              ) : list.data.map((family) => (
                <tr key={family.nkk} className="border-t border-slate-100">
                  <td className="sticky left-0 bg-white px-4 py-3">
                    <p className="font-semibold text-slate-900">{family.namaKepala}</p>
                    <p className="text-xs text-slate-500">No. KK {family.nkk} · {family.jumlahAnggota} anggota</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{family.dusun ?? "-"}, RW {family.rw ?? "-"}/RT {family.rt ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-600">{family.dueFamilyFields} keluarga · {family.dueMemberFields} anggota</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={family.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => {
                      setDetail(null);
                      setSelectedNkk(family.nkk);
                    }} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">
                      {canWrite ? "Perbarui" : "Lihat"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <span>{list?.pagination.total ?? 0} keluarga · halaman {list?.pagination.page ?? 1} dari {list?.pagination.totalPages ?? 1}</span>
          <div className="flex items-center gap-2">
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="min-h-10 rounded-lg border border-slate-300 px-2">
              {[25, 50, 100].map((value) => <option key={value} value={value}>{value} / halaman</option>)}
            </select>
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40" aria-label="Halaman sebelumnya"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" disabled={page >= (list?.pagination.totalPages ?? 1)} onClick={() => setPage((current) => current + 1)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40" aria-label="Halaman berikutnya"><ChevronRight className="h-4 w-4" /></button>
            <button type="button" onClick={loadList} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300" aria-label="Muat ulang"><RefreshCw className="h-4 w-4" /></button>
          </div>
        </div>
      </section>
    </div>
  );
}
