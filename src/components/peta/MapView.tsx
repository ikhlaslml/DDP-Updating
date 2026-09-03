"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CircleMarker, MapContainer, Polygon, Popup, useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";
import { Info } from "lucide-react";
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
                  color: occupied ? "#4f46e5" : "#f97316",
                  weight: 2,
                  fillColor: occupied ? "#6366f1" : "#fb923c",
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
          {households.map((household) => (
            <CircleMarker
              key={household.id}
              center={[household.lat, household.lng]}
              radius={7}
              pathOptions={{ color: "#fff", weight: 1, fillColor: colorFor(household, indicator), fillOpacity: 0.9 }}
            >
              <Popup className="ddp-map-popup" minWidth={300} maxWidth={380}>
                <div className="space-y-3 text-sm">
                  <p className="break-words text-base font-semibold">{household.namaKepalaKeluarga}</p>
                  <p className="break-all">No. KK: {household.nkk}</p>
                  <p>{household.alamat || `${household.dusun}, RW ${household.rw}/RT ${household.rt}`}</p>
                  <p>{household.jumlahAnggota} anggota keluarga</p>
                  <p>Status kemiskinan BPS: {household.miskinBps ? "Miskin" : "Tidak miskin"}</p>
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
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
