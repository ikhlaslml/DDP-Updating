"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { STATUS, SERIES } from "@/lib/chart-colors";

type Household = {
  id: string;
  nkk: string;
  namaKepalaKeluarga: string;
  dusun: string | null;
  rw: string | null;
  rt: string | null;
  alamat: string | null;
  lat: number;
  lng: number;
  jumlahAnggota: number;
  miskinBps: boolean;
  miskinEkstrem: boolean;
};

type IndicatorKey = "miskin_bps" | "miskin_ekstrem" | "none";

const INDICATOR_OPTIONS: { value: IndicatorKey; label: string }[] = [
  { value: "miskin_bps", label: "Status Kemiskinan (BPS)" },
  { value: "miskin_ekstrem", label: "Kemiskinan Ekstrem" },
  { value: "none", label: "Tanpa Pewarnaan" },
];

function colorFor(h: Household, indicator: IndicatorKey): string {
  if (indicator === "miskin_bps") return h.miskinBps ? STATUS.critical : STATUS.good;
  if (indicator === "miskin_ekstrem") return h.miskinEkstrem ? STATUS.critical : STATUS.good;
  return SERIES.blue;
}

export function MapView() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [indicator, setIndicator] = useState<IndicatorKey>("miskin_bps");

  useEffect(() => {
    fetch("/api/penduduk/map")
      .then((r) => r.json())
      .then((json) => setHouseholds(json.data))
      .finally(() => setLoading(false));
  }, []);

  const center = useMemo<[number, number]>(() => {
    if (households.length === 0) return [-7.6, 110.2];
    const avgLat = households.reduce((s, h) => s + h.lat, 0) / households.length;
    const avgLng = households.reduce((s, h) => s + h.lng, 0) / households.length;
    return [avgLat, avgLng];
  }, [households]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-slate-700">Warnai berdasarkan:</label>
        <select
          value={indicator}
          onChange={(e) => setIndicator(e.target.value as IndicatorKey)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {INDICATOR_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {indicator !== "none" && (
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: STATUS.good }} /> Tidak
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: STATUS.critical }} /> Ya
            </span>
          </div>
        )}
        {loading && <span className="text-sm text-slate-400">Memuat...</span>}
        <span className="text-sm text-slate-400 ml-auto">{households.length} bangunan/keluarga</span>
      </div>

      <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: 560 }}>
        <MapContainer center={center} zoom={14} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {households.map((h) => (
            <CircleMarker
              key={h.id}
              center={[h.lat, h.lng]}
              radius={8}
              pathOptions={{ color: "#fff", weight: 1, fillColor: colorFor(h, indicator), fillOpacity: 0.9 }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{h.namaKepalaKeluarga}</p>
                  <p>NKK: {h.nkk}</p>
                  <p>{h.alamat || `${h.dusun}, RW ${h.rw}/RT ${h.rt}`}</p>
                  <p>{h.jumlahAnggota} anggota keluarga</p>
                  <p>Status kemiskinan (BPS): {h.miskinBps ? "Miskin" : "Tidak miskin"}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
