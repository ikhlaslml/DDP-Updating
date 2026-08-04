"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Polygon, Popup, useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapLayers } from "@/components/peta/MapLayers";
import { STATUS, SERIES } from "@/lib/chart-colors";

type Household = {
  id: string;
  nkk: string;
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
        <label className="text-sm font-medium text-slate-700" htmlFor="map-indicator">Warnai berdasarkan:</label>
        <select
          id="map-indicator"
          value={indicator}
          onChange={(event) => setIndicator(event.target.value as IndicatorKey)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
        <span className="ml-auto text-sm text-slate-400">
          {buildings.length ? `${buildings.length} polygon bangunan • ` : ""}{households.length} keluarga
        </span>
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
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">Bangunan #{building.kode}</p>
                    <p>{occupied ? "Berpenghuni" : building.kategori ?? "Tidak berpenghuni"}</p>
                    {building.keterangan ? <p>{building.keterangan}</p> : null}
                    <p>{building.alamat || `${building.dusun}, RW ${building.rw}/RT ${building.rt}`}</p>
                    {occupied ? <p>{building.jumlahPenghuni} penghuni terdata</p> : null}
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
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{household.namaKepalaKeluarga}</p>
                  <p>No. KK: {household.nkk}</p>
                  <p>{household.alamat || `${household.dusun}, RW ${household.rw}/RT ${household.rt}`}</p>
                  <p>{household.jumlahAnggota} anggota keluarga</p>
                  <p>Status kemiskinan BPS: {household.miskinBps ? "Miskin" : "Tidak miskin"}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
