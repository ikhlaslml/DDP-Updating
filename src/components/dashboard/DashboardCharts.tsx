"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { Users, Home as HomeIcon, MapPinned, Gauge } from "lucide-react";
import { StatCard } from "./StatCard";
import { CircularProgress } from "./CircularProgress";
import { SERIES, STATUS, CHART_INK } from "@/lib/chart-colors";

type Stats = {
  totalPenduduk: number;
  totalKk: number;
  perDusun: { label: string; value: number }[];
  piramidaPenduduk: { usia: string; L: number; P: number }[];
  pendidikan: { label: string; value: number }[];
  pekerjaan: { label: string; value: number }[];
  agama: { label: string; value: number }[];
  kemiskinan: {
    miskinBps: number;
    miskinEkstrem: number;
    tidakMiskin: number;
    rataSkorKls: number | null;
  };
  cakupan: {
    ktp: number;
    aktaLahir: number;
    bpjsKes: number;
  };
};

const AGAMA_COLORS = [SERIES.blue, SERIES.orange, SERIES.aqua, SERIES.yellow, SERIES.magenta, SERIES.green];

function ChartCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {action && (
          <Link
            href={action.href}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
          >
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

export function DashboardCharts() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setStats)
      .catch(() => setError("Gagal memuat statistik."));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!stats) return <p className="text-sm text-slate-400">Memuat statistik...</p>;

  const pyramidData = stats.piramidaPenduduk.map((d) => ({ ...d, L: -d.L }));
  const miskinPct = stats.totalPenduduk
    ? Math.round((stats.kemiskinan.miskinBps / stats.totalPenduduk) * 1000) / 10
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Penduduk" value={stats.totalPenduduk.toLocaleString("id-ID")} icon={Users} />
        <StatCard label="Total KK" value={stats.totalKk.toLocaleString("id-ID")} icon={HomeIcon} />
        <StatCard label="Jumlah Dusun" value={String(stats.perDusun.length)} icon={MapPinned} />
        <StatCard
          label="Rata-rata Skor Kesejahteraan"
          value={stats.kemiskinan.rataSkorKls?.toLocaleString("id-ID") ?? "-"}
          hint="skor_kls, skala 0-100"
          icon={Gauge}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Miskin (BPS)"
          value={`${stats.kemiskinan.miskinBps.toLocaleString("id-ID")} (${miskinPct}%)`}
          dotColor={STATUS.critical}
        />
        <StatCard
          label="Miskin Ekstrem"
          value={stats.kemiskinan.miskinEkstrem.toLocaleString("id-ID")}
          dotColor={STATUS.serious}
        />
        <StatCard
          label="Tidak Miskin"
          value={stats.kemiskinan.tidakMiskin.toLocaleString("id-ID")}
          dotColor={STATUS.good}
        />
        <StatCard label="Jumlah Data Ditampilkan" value={stats.totalPenduduk.toLocaleString("id-ID")} />
      </div>

      <ChartCard title="Cakupan Kepemilikan Dokumen & Jaminan Sosial">
        <div className="flex flex-wrap items-center justify-around gap-6 py-2">
          <CircularProgress value={stats.cakupan.ktp} label="Punya KTP" color={SERIES.violet} />
          <CircularProgress value={stats.cakupan.aktaLahir} label="Punya Akta Lahir" color={SERIES.aqua} />
          <CircularProgress value={stats.cakupan.bpjsKes} label="Peserta BPJS Kesehatan" color={SERIES.yellow} />
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Sebaran Penduduk per Dusun" action={{ href: "/penduduk", label: "Lihat Data" }}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.perDusun} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid stroke={CHART_INK.grid} horizontal={false} />
              <XAxis type="number" tick={{ fill: CHART_INK.muted, fontSize: 12 }} axisLine={{ stroke: CHART_INK.axis }} />
              <YAxis
                type="category"
                dataKey="label"
                width={120}
                tick={{ fill: CHART_INK.secondary, fontSize: 12 }}
                axisLine={{ stroke: CHART_INK.axis }}
              />
              <Tooltip />
              <Bar dataKey="value" name="Penduduk" fill={SERIES.blue} radius={[0, 4, 4, 0]} barSize={18}>
                <LabelList dataKey="value" position="right" fill={CHART_INK.secondary} fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Kemiskinan (BPS)" action={{ href: "/penduduk", label: "Lihat Data" }}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[
                { label: "Tidak Miskin", value: stats.kemiskinan.tidakMiskin, key: "tidak" },
                { label: "Miskin", value: stats.kemiskinan.miskinBps, key: "miskin" },
              ]}
              layout="vertical"
              margin={{ left: 24 }}
            >
              <CartesianGrid stroke={CHART_INK.grid} horizontal={false} />
              <XAxis type="number" tick={{ fill: CHART_INK.muted, fontSize: 12 }} axisLine={{ stroke: CHART_INK.axis }} />
              <YAxis type="category" dataKey="label" width={100} tick={{ fill: CHART_INK.secondary, fontSize: 12 }} axisLine={{ stroke: CHART_INK.axis }} />
              <Tooltip />
              <Bar dataKey="value" name="Penduduk" radius={[0, 4, 4, 0]} barSize={24}>
                <Cell fill={STATUS.good} />
                <Cell fill={STATUS.critical} />
                <LabelList dataKey="value" position="right" fill={CHART_INK.secondary} fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Piramida Penduduk (Usia x Jenis Kelamin)">
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={pyramidData} layout="vertical" stackOffset="sign" margin={{ left: 8 }}>
            <CartesianGrid stroke={CHART_INK.grid} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: CHART_INK.muted, fontSize: 12 }}
              axisLine={{ stroke: CHART_INK.axis }}
              tickFormatter={(v: number) => String(Math.abs(v))}
            />
            <YAxis type="category" dataKey="usia" width={50} tick={{ fill: CHART_INK.secondary, fontSize: 12 }} axisLine={{ stroke: CHART_INK.axis }} />
            <Tooltip formatter={(v) => Math.abs(Number(v))} />
            <Legend />
            <Bar dataKey="L" name="Laki-laki" fill={SERIES.blue} stackId="pyramid" barSize={14} />
            <Bar dataKey="P" name="Perempuan" fill={SERIES.orange} stackId="pyramid" barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Komposisi Pendidikan (Ijazah)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.pendidikan} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid stroke={CHART_INK.grid} horizontal={false} />
              <XAxis type="number" tick={{ fill: CHART_INK.muted, fontSize: 11 }} axisLine={{ stroke: CHART_INK.axis }} />
              <YAxis type="category" dataKey="label" width={90} tick={{ fill: CHART_INK.secondary, fontSize: 11 }} axisLine={{ stroke: CHART_INK.axis }} />
              <Tooltip />
              <Bar dataKey="value" name="Penduduk" fill={SERIES.blue} radius={[0, 4, 4, 0]} barSize={14}>
                <LabelList dataKey="value" position="right" fill={CHART_INK.secondary} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pekerjaan Utama (10 Teratas)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.pekerjaan} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid stroke={CHART_INK.grid} horizontal={false} />
              <XAxis type="number" tick={{ fill: CHART_INK.muted, fontSize: 11 }} axisLine={{ stroke: CHART_INK.axis }} />
              <YAxis type="category" dataKey="label" width={100} tick={{ fill: CHART_INK.secondary, fontSize: 11 }} axisLine={{ stroke: CHART_INK.axis }} />
              <Tooltip />
              <Bar dataKey="value" name="Penduduk" fill={SERIES.aqua} radius={[0, 4, 4, 0]} barSize={14}>
                <LabelList dataKey="value" position="right" fill={CHART_INK.secondary} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Komposisi Agama">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={stats.agama}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {stats.agama.map((_, i) => (
                  <Cell key={i} fill={AGAMA_COLORS[i % AGAMA_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ fontSize: 11, color: CHART_INK.secondary }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
