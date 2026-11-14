import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "../store";
import { FlatMap } from "./FlatMap";

type Provider = {
  id: string;
  tiles: string | string[];
  maxzoom: number;
  attribution: string;
};

/** Cadena de respaldo: NASA → EOX Sentinel-2 → CARTO. */
const PROVIDERS: Provider[] = [
  {
    id: "gibs",
    tiles:
      "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/2020-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg",
    maxzoom: 8,
    attribution: 'NASA GIBS · Blue Marble · <a href="https://earthdata.nasa.gov/">Earthdata</a>',
  },
  {
    id: "eox",
    tiles:
      "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg",
    maxzoom: 14,
    attribution: 'EOX · <a href="https://s2maps.eu/">Sentinel-2 cloudless</a>',
  },
  {
    id: "osm",
    tiles: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxzoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
];

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

const AREA_FILL = "rgba(250, 204, 21, 0.18)";
const AREA_LINE = "#EAB308";

function GlobeMap({ flat }: { flat: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const errorCount = useRef(0);
  const [ready, setReady] = useState(false);
  const [providerIndex, setProviderIndex] = useState(0);

  const setPoint = useStore((s) => s.setPoint);
  const setPointRef = useRef(setPoint);
  setPointRef.current = setPoint;

  const lat = useStore((s) => s.lat);
  const lon = useStore((s) => s.lon);
  const polygon = useStore((s) => s.polygon);
  const bbox = useStore((s) => s.bbox);
  const flyToken = useStore((s) => s.flyToken);

  /* crear mapa */
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        projection: { type: "globe" },
        sources: {},
        layers: [
          { id: "background", type: "background", paint: { "background-color": "#0B1220" } },
        ],
        sky: {
          "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
        },
      } as any,
      center: [useStore.getState().lon, useStore.getState().lat],
      zoom: 2.1,
      minZoom: 0.6,
      maxZoom: 18,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    const el = document.createElement("div");
    el.className = "rs-marker";
    el.innerHTML = '<span class="rs-marker-ring"></span><span class="rs-marker-dot"></span>';

    markerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([useStore.getState().lon, useStore.getState().lat])
      .addTo(map);

    map.on("click", (e) => {
      setPointRef.current(e.lngLat.lat, e.lngLat.lng);
      map.flyTo({
        center: [e.lngLat.lng, e.lngLat.lat],
        zoom: Math.max(map.getZoom(), 7),
        duration: 900,
      });
    });
    map.getCanvas().style.cursor = "crosshair";

    map.on("error", (e: any) => {
      if (e?.sourceId === "earth") {
        errorCount.current += 1;
        if (errorCount.current >= 4) {
          errorCount.current = 0;
          setProviderIndex((i) => Math.min(i + 1, PROVIDERS.length - 1));
        }
      }
    });

    map.on("load", () => setReady(true));
    mapRef.current = map;

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  /* basemap con respaldo */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const provider = PROVIDERS[providerIndex];

    if (map.getLayer("earth")) map.removeLayer("earth");
    if (map.getSource("earth")) map.removeSource("earth");

    map.addSource("earth", {
      type: "raster",
      tiles: Array.isArray(provider.tiles) ? provider.tiles : [provider.tiles],
      tileSize: 256,
      maxzoom: provider.maxzoom,
      attribution: provider.attribution,
    });
    map.addLayer(
      { id: "earth", type: "raster", source: "earth" },
      map.getLayer("area-fill") ? "area-fill" : undefined,
    );
  }, [ready, providerIndex]);

  /* proyección globo / plano */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setProjection({ type: flat ? "mercator" : "globe" } as any);
  }, [flat, ready]);

  /* marcador */
  useEffect(() => {
    markerRef.current?.setLngLat([lon, lat]);
  }, [lat, lon]);

  /* polígono del municipio */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (map.getLayer("area-line")) map.removeLayer("area-line");
    if (map.getLayer("area-fill")) map.removeLayer("area-fill");
    if (map.getSource("area")) map.removeSource("area");

    if (!polygon) return;

    map.addSource("area", {
      type: "geojson",
      data: { type: "Feature", properties: {}, geometry: polygon } as any,
    });
    map.addLayer({
      id: "area-fill",
      type: "fill",
      source: "area",
      paint: { "fill-color": "#FACC15", "fill-opacity": 0.18 },
    });
    map.addLayer({
      id: "area-line",
      type: "line",
      source: "area",
      paint: { "line-color": AREA_LINE, "line-width": 2.5, "line-opacity": 0.95 },
    });
  }, [polygon, ready]);

  /* encuadre */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || flyToken === 0) return;
    if (bbox) {
      map.fitBounds(
        [
          [bbox[1], bbox[0]],
          [bbox[3], bbox[2]],
        ],
        { padding: 48, maxZoom: 12, duration: 1600 },
      );
    } else {
      map.flyTo({ center: [lon, lat], zoom: 8, duration: 1600, essential: true });
    }
  }, [flyToken, ready]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

export function GlobeView() {
  const { t } = useTranslation();
  const lat = useStore((s) => s.lat);
  const lon = useStore((s) => s.lon);
  const [webgl] = useState(supportsWebGL);
  const [flat, setFlat] = useState(false);

  return (
    <div className="relative h-full w-full bg-[#0B1220]">
      {webgl ? <GlobeMap flat={flat} /> : <FlatMap />}

      <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[240px] rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-bone backdrop-blur">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
          <Globe2 size={12} /> {t("map.selected")}
        </p>
        <p className="num mt-1 text-[11px] text-white/90">
          {lat.toFixed(3)}°, {lon.toFixed(3)}°
        </p>
        {webgl && (
          <button
            type="button"
            onClick={() => setFlat((v) => !v)}
            className="pointer-events-auto mt-1.5 rounded-full border border-white/20 px-2 py-0.5 text-[9px] uppercase tracking-wide text-white/70 transition-colors hover:bg-white/10"
          >
            {flat ? t("map.globe") : t("map.flat")}
          </button>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-center text-[11px] text-white/80 backdrop-blur">
        {t("map.hint")}
      </div>
    </div>
  );
}
