"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CircleMarker, MapContainer, Polygon, Popup, useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";
import { Building2, ImageOff, Info, MapPin, UsersRound } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { MapLayers } from "@/components/peta/MapLayers";
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
  miskinBps: boolean;
  miskinEkstrem: boolean;
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

type IndicatorKey = "miskin_bps" | "miskin_ekstrem" | "none";

const INDICATOR_OPTIONS: { value: IndicatorKey; label: string }[] = [
  { value: "miskin_bps", label: "Status Kemiskinan (BPS)" },
  { value: "miskin_ekstrem", label: "Kemiskinan Ekstrem" },
  { value: "none", label: "Tanpa Pewarnaan" },
];

function colorFor(household: Household, indicator: IndicatorKey): string {
  if (indicator === "miskin_bps") return household.miskinBps ? STATUS.critical : STATUS.good;
  if (indicator === "miskin_ekstrem") return household.miskinEkstrem ? STATUS.critical : STATUS.good;
  return SERIES.blue;
}

function MapBuildingPhoto({ code }: { code: number }) {
  const [available, setAvailable] = useState(true);

  if (!available) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
        <ImageOff className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Foto belum tersedia. Buka detail bangunan untuk melihat keterangannya.</p>
      </div>
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
      className="h-28 w-full rounded-xl border border-slate-200 object-cover"
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
  const [indicator, setIndicator] = useState<IndicatorKey>("miskin_bps");

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
        {indicator !== "none" ? (
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ background: STATUS.good }} /> Tidak</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ background: STATUS.critical }} /> Ya</span>
          </div>
        ) : null}
        {loading ? <span className="text-sm text-slate-400">Memuat peta...</span> : null}
        <span className="w-full text-sm text-slate-400 sm:ml-auto sm:w-auto">
          {buildings.length ? `${buildings.length} poligon bangunan - ` : ""}{households.length} keluarga
        </span>
      </div>

      <div className="mb-3 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs leading-relaxed text-indigo-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
        <div>
          <p><strong>Petunjuk peta:</strong> ketuk titik keluarga atau poligon bangunan untuk melihat ringkasan, foto, dan tombol menuju detail.</p>
          {!loading && buildings.length === 0 ? <p className="mt-1 text-indigo-700">Poligon bangunan belum tersedia pada data saat ini; gunakan titik keluarga.</p> : null}
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
                  color: occupied ? "#4f46e5" : "#f97316",
                  weight: 2,
                  fillColor: occupied ? "#6366f1" : "#fb923c",
                  fillOpacity: 0.22,
                }}
              >
                <Popup className="ddp-map-popup" minWidth={280} maxWidth={340}>
                  <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4 pr-10 text-sm text-slate-700">
                    <div className="border-b border-slate-100 pb-3">
                      <p className="flex items-center gap-2 text-base font-bold text-slate-950"><Building2 className="h-5 w-5 text-indigo-600" /> Bangunan #{building.kode}</p>
                      <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${occupied ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{occupied ? "Berpenghuni" : building.kategori ?? "Tidak berpenghuni"}</span>
                    </div>
                    <p className="flex items-start gap-2 leading-relaxed"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> {building.alamat || `${building.dusun}, RW ${building.rw}/RT ${building.rt}`}</p>
                    {building.keterangan ? <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed">{building.keterangan}</p> : null}
                    {occupied ? <p className="flex items-center gap-2 text-xs font-medium text-slate-600"><UsersRound className="h-4 w-4 text-indigo-500" /> {building.jumlahPenghuni} penghuni terdata</p> : null}
                    <MapBuildingPhoto code={building.kode} />
                    <Link href={`/bangunan/${building.kode}`} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-3 py-2 text-center font-semibold !text-white shadow-sm hover:bg-indigo-700">
                      Buka detail bangunan
                    </Link>
                  </div>
                </Popup>
              </Polygon>
            );
          })}
          {households.map((household) => (
            <CircleMarker
              key={household.id}
              center={[household.lat, household.lng]}
              radius={7}
              pathOptions={{ color: "#fff", weight: 1, fillColor: colorFor(household, indicator), fillOpacity: 0.9 }}
            >
              <Popup className="ddp-map-popup" minWidth={280} maxWidth={340}>
                <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4 pr-10 text-sm text-slate-700">
                  <div className="border-b border-slate-100 pb-3">
                    <p className="break-words text-base font-bold text-slate-950">{household.namaKepalaKeluarga}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">No. KK {household.nkk}</p>
                  </div>
                  <p className="flex items-start gap-2 leading-relaxed"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> {household.alamat || `${household.dusun}, RW ${household.rw}/RT ${household.rt}`}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Anggota</p><p className="mt-1 font-bold text-slate-800">{household.jumlahAnggota} orang</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Kemiskinan BPS</p><p className={`mt-1 font-bold ${household.miskinBps ? "text-rose-700" : "text-emerald-700"}`}>{household.miskinBps ? "Miskin" : "Tidak miskin"}</p></div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link href={`/penduduk/${household.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-indigo-200 bg-white px-3 py-2 text-center font-semibold !text-indigo-700 hover:bg-indigo-50">
                      Buka detail warga
                    </Link>
                    {household.kodeBangunan !== null ? (
                      <>
                        <MapBuildingPhoto code={household.kodeBangunan} />
                        <Link href={`/bangunan/${household.kodeBangunan}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-3 py-2 text-center font-semibold !text-white shadow-sm hover:bg-indigo-700">
                          Buka bangunan #{household.kodeBangunan}
                        </Link>
                      </>
                    ) : (
                      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Kode bangunan belum tersedia.</p>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
