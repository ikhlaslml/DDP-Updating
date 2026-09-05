"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CircleMarker, MapContainer, Polygon, Popup, useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";
import { Info } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { MapLayers } from "@/components/peta/MapLayers";
import { BRAND_COLORS } from "@/lib/brand-colors";
import { STATUS, SERIES } from "@/lib/chart-colors";

type Household = {
  id: string;
  nkk: string;
  kodeBangunan: number | null;
  namaKepalaKeluarga: string;
  dusun: string | null;
  rw: number | null;
  rt: number | null;
  alamat: string | null;
  lat: number;
  lng: number;
  jumlahAnggota: number;
  anggotaPunyaKtp: number;
  anggotaPunyaAktaLahir: number;
  anggotaBpjsKesehatan: number;
  rumahPln: string | null;
  airBersih: string | null;
  update6MonthStatus: "JATUH_TEMPO" | "MENUNGGU_PENGGABUNGAN" | "TERKINI";
  updateAnnualStatus: "JATUH_TEMPO" | "MENUNGGU_PENGGABUNGAN" | "TERKINI";
};

type Building = {
  id: string;
  kode: number;
  jenis: "BERPENGHUNI" | "TIDAK_BERPENGHUNI";
  kategori: string | null;
  keterangan: string | null;
  polygon: { type: "Polygon"; coordinates: number[][][] };
  centroidLat: number;
  centroidLng: number;
  dusun: string | null;
  rw: number | null;
  rt: number | null;
  alamat: string | null;
  jumlahPenghuni: number;
};

type IndicatorKey = "family_size" | "documents" | "bpjs" | "utilities" | "update_6" | "update_12" | "dusun" | "none";

const INDICATOR_OPTIONS: { value: IndicatorKey; label: string }[] = [
  { value: "family_size", label: "Jumlah Anggota Keluarga" },
  { value: "documents", label: "Kelengkapan Dokumen" },
  { value: "bpjs", label: "BPJS Kesehatan" },
  { value: "utilities", label: "Listrik dan Air Bersih" },
  { value: "update_6", label: "Status Pembaruan 6 Bulan" },
  { value: "update_12", label: "Status Pembaruan 1 Tahun" },
  { value: "dusun", label: "Dusun" },
  { value: "none", label: "Tanpa Pewarnaan" },
];

const DUSUN_COLORS = [SERIES.blue, SERIES.orange, SERIES.aqua, SERIES.yellow, SERIES.magenta, SERIES.green, SERIES.red];

function hasAccess(value: string | null) {
  const normalized = value?.trim().toLocaleLowerCase("id-ID");
  return Boolean(normalized && !["tidak", "tidak ada", "0", "-"].includes(normalized));
}

function indicatorResult(household: Household, indicator: IndicatorKey, dusunColors: Map<string, string>) {
  if (indicator === "family_size") {
    if (household.jumlahAnggota <= 2) return { color: "#9EBED3", label: "1–2 anggota" };
    if (household.jumlahAnggota <= 4) return { color: "#3E6F92", label: "3–4 anggota" };
    if (household.jumlahAnggota <= 6) return { color: SERIES.blue, label: "5–6 anggota" };
    return { color: STATUS.critical, label: "7 anggota atau lebih" };
  }
  if (indicator === "documents") {
    const complete =
      household.anggotaPunyaKtp === household.jumlahAnggota &&
      household.anggotaPunyaAktaLahir === household.jumlahAnggota;
    const none = household.anggotaPunyaKtp === 0 && household.anggotaPunyaAktaLahir === 0;
    return complete
      ? { color: STATUS.good, label: "Dokumen seluruh anggota lengkap" }
      : none
        ? { color: STATUS.critical, label: "Belum ada dokumen tercatat" }
        : { color: STATUS.warning, label: "Dokumen sebagian anggota belum lengkap" };
  }
  if (indicator === "bpjs") {
    if (household.anggotaBpjsKesehatan === household.jumlahAnggota) {
      return { color: STATUS.good, label: "Seluruh anggota terdaftar" };
    }
    if (household.anggotaBpjsKesehatan === 0) {
      return { color: STATUS.critical, label: "Belum ada anggota terdaftar" };
    }
    return { color: STATUS.warning, label: "Sebagian anggota terdaftar" };
  }
  if (indicator === "utilities") {
    const electricity = hasAccess(household.rumahPln);
    const water = hasAccess(household.airBersih);
    if (electricity && water) return { color: STATUS.good, label: "Listrik dan air bersih tersedia" };
    if (electricity || water) return { color: STATUS.warning, label: "Salah satu layanan belum tersedia" };
    return { color: STATUS.critical, label: "Listrik dan air bersih belum tercatat" };
  }
  if (indicator === "update_6" || indicator === "update_12") {
    const status =
      indicator === "update_6" ? household.update6MonthStatus : household.updateAnnualStatus;
    if (status === "JATUH_TEMPO") return { color: STATUS.critical, label: "Jatuh tempo" };
    if (status === "MENUNGGU_PENGGABUNGAN") {
      return { color: STATUS.warning, label: "Menunggu diterapkan" };
    }
    return { color: STATUS.good, label: "Terkini" };
  }
  if (indicator === "dusun") {
    const name = household.dusun?.trim() || "Tanpa dusun";
    return { color: dusunColors.get(name) ?? SERIES.violet, label: name };
  }
  return { color: SERIES.blue, label: "Titik keluarga" };
}

function MapBuildingPhoto({ code }: { code: number }) {
  const [available, setAvailable] = useState(true);

  if (!available) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Foto belum tersedia. Buka detail bangunan untuk melihat keterangannya.
      </p>
    );
  }

  return (
    <Image
      src={`/api/bangunan/${code}/foto-ddp`}
      alt={`Foto bangunan DDP nomor ${code}`}
      width={280}
      height={160}
      unoptimized
      onError={() => setAvailable(false)}
      className="h-32 w-full rounded-lg border border-slate-200 object-cover"
    />
  );
}

function FitData({ points, fallbackCenter }: { points: [number, number][]; fallbackCenter: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) {
      map.setView(fallbackCenter, map.getZoom());
      return;
    }
    if (points.length === 1) map.setView(points[0], 19);
    else map.fitBounds(latLngBounds(points), { padding: [32, 32], maxZoom: 19 });
  }, [fallbackCenter, map, points]);
  return null;
}

export function MapView() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [droneTilePrefix, setDroneTilePrefix] = useState<string | null>(null);
  const [configuredCenter, setConfiguredCenter] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [indicator, setIndicator] = useState<IndicatorKey>("family_size");

  useEffect(() => {
    fetch("/api/penduduk/map")
      .then((response) => response.json())
      .then((json) => {
        setHouseholds(json.data ?? []);
        setBuildings(json.buildings ?? []);
        setDroneTilePrefix(json.context?.droneTilePrefix ?? null);
        if (typeof json.context?.centerLat === "number" && typeof json.context?.centerLng === "number") {
          setConfiguredCenter([json.context.centerLat, json.context.centerLng]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const center = useMemo<[number, number]>(() => {
    if (configuredCenter) return configuredCenter;
    if (households.length === 0) return [-7.6, 110.2];
    return [
      households.reduce((sum, item) => sum + item.lat, 0) / households.length,
      households.reduce((sum, item) => sum + item.lng, 0) / households.length,
    ];
  }, [configuredCenter, households]);

  const fitPoints = useMemo<[number, number][]>(
    () => [
      ...buildings.map((building) => [building.centroidLat, building.centroidLng] as [number, number]),
      ...households.map((household) => [household.lat, household.lng] as [number, number]),
    ],
    [buildings, households]
  );
  const dusunColors = useMemo(
    () =>
      new Map(
        [...new Set(households.map((household) => household.dusun?.trim() || "Tanpa dusun"))]
          .sort((left, right) => left.localeCompare(right, "id-ID"))
          .map((name, index) => [name, DUSUN_COLORS[index % DUSUN_COLORS.length]]),
      ),
    [households],
  );
  const legend = useMemo(() => {
    if (indicator === "family_size") {
      return [
        ["#9EBED3", "1–2 anggota"],
        ["#3E6F92", "3–4 anggota"],
        [SERIES.blue, "5–6 anggota"],
        [STATUS.critical, "7+ anggota"],
      ];
    }
    if (indicator === "documents") {
      return [[STATUS.good, "Lengkap"], [STATUS.warning, "Sebagian"], [STATUS.critical, "Belum tercatat"]];
    }
    if (indicator === "bpjs") {
      return [[STATUS.good, "Seluruh anggota"], [STATUS.warning, "Sebagian"], [STATUS.critical, "Belum ada"]];
    }
    if (indicator === "utilities") {
      return [[STATUS.good, "Keduanya tersedia"], [STATUS.warning, "Salah satu"], [STATUS.critical, "Belum tercatat"]];
    }
    if (indicator === "update_6" || indicator === "update_12") {
      return [[STATUS.good, "Terkini"], [STATUS.warning, "Menunggu diterapkan"], [STATUS.critical, "Jatuh tempo"]];
    }
    if (indicator === "dusun") return [...dusunColors].map(([name, color]) => [color, name]);
    return [[SERIES.blue, "Titik keluarga"]];
  }, [dusunColors, indicator]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="w-full text-sm font-medium text-slate-700 sm:w-auto" htmlFor="map-indicator">Warnai berdasarkan:</label>
        <select
          id="map-indicator"
          value={indicator}
          onChange={(event) => setIndicator(event.target.value as IndicatorKey)}
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:w-auto"
        >
          {INDICATOR_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <div className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600" aria-label="Legenda peta">
          {legend.map(([color, label]) => (
            <span key={`${color}-${label}`} className="flex items-center gap-1.5">
              <span className="h-3 w-3 shrink-0 rounded-full border border-white shadow-sm" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
        {loading ? <span className="text-sm text-slate-400">Memuat peta...</span> : null}
        <span className="w-full text-sm text-slate-400 sm:ml-auto sm:w-auto">
          {buildings.length ? `${buildings.length} bangunan terpetakan · ` : ""}{households.length} keluarga
        </span>
      </div>

      <div className="mb-3 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs leading-relaxed text-indigo-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
        <div>
          <p><strong>Petunjuk peta:</strong> ketuk titik keluarga atau batas bangunan untuk melihat ringkasan, foto, dan tombol menuju detail.</p>
          {!loading && buildings.length === 0 ? <p className="mt-1 text-indigo-700">Bentuk bangunan belum tersedia untuk data ini. Gunakan titik keluarga untuk membuka rincian.</p> : null}
        </div>
      </div>

      <div className="min-h-[420px] overflow-hidden rounded-xl border border-slate-200 sm:h-[560px]">
        <MapContainer center={center} zoom={14} maxZoom={23} scrollWheelZoom style={{ height: "100%", minHeight: 420, width: "100%" }}>
          <MapLayers droneTilePrefix={droneTilePrefix} />
          <FitData points={fitPoints} fallbackCenter={center} />
          {buildings.map((building) => {
            const positions = building.polygon.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
            const occupied = building.jenis === "BERPENGHUNI";
            return (
              <Polygon
                key={building.id}
                positions={positions}
                pathOptions={{
                  color: occupied ? BRAND_COLORS.navy : "#f97316",
                  weight: 2,
                  fillColor: occupied ? BRAND_COLORS.navyMuted : "#fb923c",
                  fillOpacity: 0.22,
                }}
              >
                <Popup className="ddp-map-popup" minWidth={300} maxWidth={380}>
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold">Bangunan #{building.kode}</p>
                    <p>{occupied ? "Berpenghuni" : building.kategori ?? "Tidak berpenghuni"}</p>
                    {building.keterangan ? <p>{building.keterangan}</p> : null}
                    <p>{building.alamat || `${building.dusun}, RW ${building.rw}/RT ${building.rt}`}</p>
                    {occupied ? <p>{building.jumlahPenghuni} penghuni terdata</p> : null}
                    <MapBuildingPhoto code={building.kode} />
                    <Link href={`/bangunan/${building.kode}`} className="ddp-map-primary-link mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-center font-semibold hover:bg-indigo-700">
                      Lihat bangunan dan foto
                    </Link>
                  </div>
                </Popup>
              </Polygon>
            );
          })}
          {households.map((household) => {
            const result = indicatorResult(household, indicator, dusunColors);
            return (
              <CircleMarker
                key={household.id}
                center={[household.lat, household.lng]}
                radius={7}
                pathOptions={{ color: "#fff", weight: 1, fillColor: result.color, fillOpacity: 0.9 }}
              >
                <Popup className="ddp-map-popup" minWidth={300} maxWidth={380}>
                  <div className="space-y-3 text-sm">
                    <p className="break-words text-base font-semibold">{household.namaKepalaKeluarga}</p>
                    <p className="break-all">No. KK: {household.nkk}</p>
                    <p>{household.alamat || `${household.dusun}, RW ${household.rw}/RT ${household.rt}`}</p>
                    <p>{household.jumlahAnggota} anggota keluarga</p>
                    <p className="rounded-lg bg-slate-50 px-3 py-2 font-medium text-slate-700">
                      {INDICATOR_OPTIONS.find((option) => option.value === indicator)?.label}: {result.label}
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      <Link href={`/penduduk/${household.id}`} className="ddp-map-secondary-link inline-flex min-h-11 items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 py-2 text-center font-semibold hover:bg-indigo-50">
                        Lihat data warga
                      </Link>
                      {household.kodeBangunan !== null ? (
                        <>
                          <MapBuildingPhoto code={household.kodeBangunan} />
                          <Link href={`/bangunan/${household.kodeBangunan}`} className="ddp-map-primary-link inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-center font-semibold hover:bg-indigo-700">
                            Lihat bangunan dan foto #{household.kodeBangunan}
                          </Link>
                        </>
                      ) : (
                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Kode bangunan belum tersedia.</p>
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
