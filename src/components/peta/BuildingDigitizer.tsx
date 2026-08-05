"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Crosshair, LocateFixed, Pentagon, RotateCcw, Undo2 } from "lucide-react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapLayers } from "@/components/peta/MapLayers";
import type { SpatialPoint } from "@/lib/building";

function centroid(points: SpatialPoint[]): SpatialPoint | null {
  if (points.length < 3) return null;
  const origin = points[0];
  let twiceArea = 0;
  let localLng = 0;
  let localLat = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const currentLng = current.lng - origin.lng;
    const currentLat = current.lat - origin.lat;
    const nextLng = next.lng - origin.lng;
    const nextLat = next.lat - origin.lat;
    const cross = currentLng * nextLat - nextLng * currentLat;
    twiceArea += cross;
    localLng += (currentLng + nextLng) * cross;
    localLat += (currentLat + nextLat) * cross;
  }
  if (Math.abs(twiceArea) < 1e-12) return null;
  return {
    lng: origin.lng + localLng / (3 * twiceArea),
    lat: origin.lat + localLat / (3 * twiceArea),
  };
}

function ClickCapture({
  enabled,
  onPoint,
}: {
  enabled: boolean;
  onPoint: (point: SpatialPoint) => void;
}) {
  useMapEvents({
    click(event) {
      if (enabled) onPoint({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom() || 19);
  }, [center, map]);
  return null;
}

function DrawingBehavior({ drawing }: { drawing: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (drawing) map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();
  }, [drawing, map]);
  return null;
}

export function BuildingDigitizer({
  points,
  onChange,
  center,
  droneTilePrefix,
}: {
  points: SpatialPoint[];
  onChange: (points: SpatialPoint[]) => void;
  center: [number, number];
  droneTilePrefix?: string | null;
}) {
  const [drawing, setDrawing] = useState(points.length < 3);
  const [locating, setLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState(center);
  const centerPoint = useMemo(() => centroid(points), [points]);
  const positions = points.map((point) => [point.lat, point.lng] as [number, number]);

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMapCenter([position.coords.latitude, position.coords.longitude]);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
        <div className="flex items-start gap-2 text-sm text-indigo-900">
          <Crosshair className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">
              {drawing ? "Klik setiap sudut atap bangunan pada peta" : "Polygon bangunan siap digunakan"}
            </p>
            <p className="text-xs text-indigo-700">
              {points.length} titik direkam{centerPoint ? ` • centroid ${centerPoint.lat.toFixed(6)}, ${centerPoint.lng.toFixed(6)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={drawing}
            aria-label="Aktifkan mode digitasi bangunan"
            onClick={() => setDrawing(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-200"
          >
            <Pentagon className="h-4 w-4" /> Digitasi
          </button>
          <button
            type="button"
            disabled={!points.length}
            onClick={() => onChange(points.slice(0, -1))}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" /> Urungkan
          </button>
          <button
            type="button"
            disabled={!points.length}
            onClick={() => {
              onChange([]);
              setDrawing(true);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button
            type="button"
            disabled={points.length < 3}
            onClick={() => setDrawing(false)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            <Check className="h-4 w-4" /> Selesai
          </button>
        </div>
      </div>

      <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner sm:h-[590px]">
        <MapContainer
          center={mapCenter}
          zoom={19}
          maxZoom={23}
          scrollWheelZoom
          doubleClickZoom={false}
          className={drawing ? "leaflet-crosshair" : undefined}
          style={{ height: "100%", minHeight: 420, width: "100%" }}
        >
          <MapLayers droneTilePrefix={droneTilePrefix} />
          <Recenter center={mapCenter} />
          <DrawingBehavior drawing={drawing} />
          <ClickCapture enabled={drawing} onPoint={(point) => onChange([...points, point])} />
          {positions.length >= 3 ? (
            <Polygon
              positions={positions}
              pathOptions={{ color: "#4f46e5", weight: 3, fillColor: "#6366f1", fillOpacity: 0.22 }}
            />
          ) : positions.length >= 2 ? (
            <Polyline positions={positions} pathOptions={{ color: "#4f46e5", weight: 3, dashArray: "8 6" }} />
          ) : null}
          {points.map((point, index) => (
            <CircleMarker
              key={`${point.lat}-${point.lng}-${index}`}
              center={[point.lat, point.lng]}
              radius={5}
              pathOptions={{ color: "white", weight: 2, fillColor: "#4f46e5", fillOpacity: 1 }}
            >
              <Tooltip permanent direction="top" offset={[0, -5]}>{index + 1}</Tooltip>
            </CircleMarker>
          ))}
          {centerPoint ? (
            <CircleMarker
              center={[centerPoint.lat, centerPoint.lng]}
              radius={7}
              pathOptions={{ color: "white", weight: 3, fillColor: "#f97316", fillOpacity: 1 }}
            >
              <Popup>
                <strong>Titik tengah bangunan</strong>
                <br />
                {centerPoint.lat.toFixed(7)}, {centerPoint.lng.toFixed(7)}
              </Popup>
            </CircleMarker>
          ) : null}
        </MapContainer>
        <button
          type="button"
          title="Pusatkan ke lokasi perangkat"
          aria-label="Pusatkan ke lokasi perangkat"
          onClick={locate}
          className="absolute bottom-4 right-4 z-[1000] inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-700 shadow-lg ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
          disabled={locating}
        >
          <LocateFixed className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
