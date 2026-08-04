"use client";

import { LayersControl, TileLayer } from "react-leaflet";

export function MapLayers({ droneTilePrefix }: { droneTilePrefix?: string | null }) {
  return (
    <LayersControl position="topright" collapsed>
      <LayersControl.BaseLayer name="OpenStreetMap">
        <TileLayer
          maxNativeZoom={19}
          maxZoom={23}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer checked name="Esri ArcGIS">
        <TileLayer
          maxZoom={23}
          attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
      </LayersControl.BaseLayer>
      {droneTilePrefix ? (
        <LayersControl.Overlay name="Drone DataDesaPresisi">
          <TileLayer
            minNativeZoom={13}
            maxNativeZoom={19}
            maxZoom={22}
            noWrap
            attribution="Citra drone Data Desa Presisi"
            url={`https://storage.googleapis.com/maps-xyz/${droneTilePrefix}/{z}/{x}/{y}.png`}
          />
        </LayersControl.Overlay>
      ) : null}
    </LayersControl>
  );
}
