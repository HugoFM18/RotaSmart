import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useStore } from "../store";

type TileProvider = { id: string; url: string; maxZoom: number; attribution: string };

/** Cadena de respaldo de tiles para el mapa 2D. */
const TILE_PROVIDERS: TileProvider[] = [
  {
    id: "osm",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  {
    id: "esri-imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 18,
    attribution: "Tiles &copy; Esri · Maxar · Earthstar Geographics",
  },
  {
    id: "esri-streets",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 18,
    attribution: "Tiles &copy; Esri",
  },
];

export function FlatMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.TileLayer | null>(null);
  const providerRef = useRef(0);
  const errorsRef = useRef(0);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const areaRef = useRef<L.GeoJSON | null>(null);

  const lat = useStore((s) => s.lat);
  const lon = useStore((s) => s.lon);
  const polygon = useStore((s) => s.polygon);
  const bbox = useStore((s) => s.bbox);
  const flyToken = useStore((s) => s.flyToken);
  const setPoint = useStore((s) => s.setPoint);

  const setPointRef = useRef(setPoint);
  setPointRef.current = setPoint;

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [useStore.getState().lat, useStore.getState().lon],
      zoom: 5,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true,
    });

    const applyProvider = (index: number) => {
      layerRef.current?.remove();
      const provider = TILE_PROVIDERS[index];
      const layer = L.tileLayer(provider.url, {
        maxZoom: provider.maxZoom,
        attribution: provider.attribution,
        crossOrigin: true,
      });
      layer.on("tileerror", () => {
        errorsRef.current += 1;
        if (
          errorsRef.current >= 4 &&
          providerRef.current < TILE_PROVIDERS.length - 1
        ) {
          errorsRef.current = 0;
          providerRef.current += 1;
          applyProvider(providerRef.current);
        }
      });
      layer.addTo(map);
      layerRef.current = layer;
    };

    applyProvider(0);

    markerRef.current = L.circleMarker(
      [useStore.getState().lat, useStore.getState().lon],
      { radius: 7, color: "#ffffff", weight: 2, fillColor: "#C77D13", fillOpacity: 1 },
    ).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      setPointRef.current(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, Math.max(map.getZoom(), 7), { duration: 0.9 });
    });

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 50);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    markerRef.current?.setLatLng([lat, lon]);
  }, [lat, lon]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (areaRef.current) {
      map.removeLayer(areaRef.current);
      areaRef.current = null;
    }
    if (polygon) {
      areaRef.current = L.geoJSON(polygon, {
        style: {
          color: "#EAB308",
          weight: 2.5,
          opacity: 0.95,
          fillColor: "#FACC15",
          fillOpacity: 0.18,
        },
      }).addTo(map);
    }
  }, [polygon]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || flyToken === 0) return;
    if (bbox) {
      map.flyToBounds(
        [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]],
        ],
        { padding: [28, 28], duration: 1.2, maxZoom: 13 },
      );
    } else {
      map.flyTo([lat, lon], 9, { duration: 1.2 });
    }
  }, [flyToken]);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
}
