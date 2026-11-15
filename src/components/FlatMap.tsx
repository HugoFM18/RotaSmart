import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useStore } from "../store";
import { pickLocation } from "../pick";
import { IMAGERY_PROVIDERS } from "../map/imagery";
import { WorldFlatLayers } from "../map/WorldFlatLayers";

/** Cadena de respaldo de tiles para el mapa 2D. */
const TILE_PROVIDERS = IMAGERY_PROVIDERS;

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

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;

    const map = L.map(containerRef.current, {
      center: [useStore.getState().lat, useStore.getState().lon],
      zoom: 5,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
    });
    map.createPane("world-boundaries").style.zIndex = "410";
    map.createPane("selected-area").style.zIndex = "430";
    const boundaries = new WorldFlatLayers(map);
    void boundaries.start();

    const applyProvider = (index: number) => {
      layerRef.current?.remove();
      const provider = TILE_PROVIDERS[index];
      const layer = L.tileLayer(provider.url, {
        maxZoom: provider.maxZoom,
        attribution: provider.attribution,
        crossOrigin: true,
      });
      layer.on("tileerror", () => {
        if (disposed || layerRef.current !== layer) return;
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
      pickLocation(e.latlng.lat, e.latlng.lng, 10);
    });

    mapRef.current = map;
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 50);
    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resizeObserver.observe(containerRef.current);

    return () => {
      disposed = true;
      window.clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      boundaries.dispose();
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
        pane: "selected-area",
        style: {
          color: "#F0B429",
          weight: 2.5,
          opacity: 1,
          fillColor: "#FFD54F",
          fillOpacity: 0.22,
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
