import React, { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const markerColors = {
  green: '#16a34a',
  orange: '#f97316',
  red: '#dc2626',
};

function RecenterMap({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, map, zoom]);

  return null;
}

function createMarkerIcon(color, isSelected) {
  const markerColor = markerColors[color] || markerColors.green;
  const size = isSelected ? 30 : 24;

  return L.divIcon({
    className: '',
    html: `<span style="
      display:block;
      width:${size}px;
      height:${size}px;
      border-radius:9999px;
      background:${markerColor};
      border:4px solid #ffffff;
      box-shadow:0 10px 24px rgba(15,23,42,0.22);
    "></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function MapView({ mapCenter, mapZoom, selectedState, selectedZone, zones }) {
  const selectedZoneData = zones.find((zone) => zone.zone === selectedZone);
  const center = selectedZoneData?.coordinates || mapCenter;
  const zoom = selectedZoneData ? Math.max(mapZoom + 2, 9) : mapZoom;

  const markerIcons = useMemo(
    () =>
      zones.reduce(
        (icons, zone) => ({
          ...icons,
          [zone.zone]: createMarkerIcon(zone.markerColor, zone.zone === selectedZone),
        }),
        {}
      ),
    [selectedZone, zones]
  );

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{selectedState} Zone Map</h3>
          <p className="mt-1 text-sm text-gray-500">Risk markers across monitored urban zones.</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
            Low
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
            High
          </span>
        </div>
      </div>

      <div className="h-[360px] overflow-hidden rounded-2xl border border-gray-100">
        <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="h-full w-full">
          <RecenterMap center={center} zoom={zoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {zones.map((zone) => (
            <Marker key={zone.zone} position={zone.coordinates} icon={markerIcons[zone.zone]}>
              <Popup>
                <div className="min-w-40">
                  <p className="text-sm font-bold text-gray-900">{zone.zone}</p>
                  <p className="mt-1 text-xs text-gray-600">AQI: {zone.aqi}</p>
                  <p className="text-xs text-gray-600">Water: {zone.water_quality}</p>
                  <p className="text-xs text-gray-600">Risk Score: {zone.risk_score}%</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}

export default MapView;
