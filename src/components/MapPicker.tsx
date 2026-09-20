import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: number;
};

export function MapPicker({ lat, lng, onChange, height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      const DefaultIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      L.Marker.prototype.options.icon = DefaultIcon;

      const initLat = lat ?? 40.3894;
      const initLng = lng ?? 71.7864;
      const map = L.map(containerRef.current).setView([initLat, initLng], lat ? 14 : 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      if (lat && lng) markerRef.current = L.marker([lat, lng]).addTo(map);

      map.on("click", (e: any) => {
        const { lat: la, lng: ln } = e.latlng;
        if (markerRef.current) markerRef.current.setLatLng(e.latlng);
        else markerRef.current = L.marker(e.latlng).addTo(map);
        onChange(la, ln);
      });

      mapRef.current = map;
      setReady(true);
      setTimeout(() => map.invalidateSize(), 150);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || lat == null || lng == null) return;
    (async () => {
      const L = (await import("leaflet")).default;
      if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
      else markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
      mapRef.current.setView([lat, lng], 14);
    })();
  }, [lat, lng, ready]);

  return (
    <div
      ref={containerRef}
      style={{ height: `${height}px` }}
      className="w-full overflow-hidden rounded-xl border border-border bg-cream"
    />
  );
}

export function MapView({ lat, lng, height = 280 }: { lat: number; lng: number; height?: number }) {
  const src = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  return (
    <iframe
      src={src}
      style={{ height: `${height}px`, border: 0 }}
      className="w-full rounded-xl"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      title="Lokatsiya"
    />
  );
}
