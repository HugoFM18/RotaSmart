import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "../store";
import { FallbackMap } from "./FallbackMap";

const BLUE_MARBLE =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/2020-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg";

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function GlobeMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const setPoint = useStore((s) => s.setPoint);
  const setPointRef = useRef(setPoint);
  setPointRef.current = setPoint;

  const lat = useStore((s) => s.lat);
  const lon = useStore((s) => s.lon);
  const flyToken = useStore((s) => s.flyToken);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        projection: { type: "globe" },
        sources: {
          earth: {
            type: "raster",
            tiles: [BLUE_MARBLE],
            tileSize: 256,
            maxzoom: 8,
            attribution:
              'NASA GIBS · Blue Marble · <a href="https://earthdata.nasa.gov/">Earthdata</a>',
          },
        },
        layers: [
          { id: "background", type: "background", paint: { "background-color": "#0B1220" } },
          { id: "earth", type: "raster", source: "earth" },
        ],
        sky: {
          "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
        },
      } as any,
      center: [useStore.getState().lon, useStore.getState().lat],
      zoom: 2.1,
      minZoom: 0.6,
      maxZoom: 8,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    const el = document.createElement("div");
    el.className = "rs-marker";
    el.innerHTML = '<span class="rs-marker-ring"></span><span class="rs-marker-dot"></span>';

    markerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([useStore.getState().lon, useStore.getState().lat])
      .addTo(map);

    map.on("click", (e) => setPointRef.current(e.lngLat.lat, e.lngLat.lng));
    map.getCanvas().style.cursor = "crosshair";

    mapRef.current = map;

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    markerRef.current?.setLngLat([lon, lat]);
  }, [lat, lon]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || flyToken === 0) return;
    map.flyTo({ center: [lon, lat], zoom: 4.2, duration: 1600, essential: true });
  }, [flyToken]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

export function GlobeView() {
  const { t } = useTranslation();
  const lat = useStore((s) => s.lat);
  const lon = useStore((s) => s.lon);

  const [mode, setMode] = useState<"globe" | "flat">(() =>
    supportsWebGL() ? "globe" : "flat",
  );

  return (
    <div className="relative h-full w-full bg-[#0B1220]">
      {mode === "globe" ? <GlobeMap /> : <FallbackMap />}

      <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[240px] rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-bone backdrop-blur">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
          <Globe2 size={12} /> {t("map.selected")}
        </p>
        <p className="num mt-1 text-[11px] text-white/90">
          {lat.toFixed(3)}°, {lon.toFixed(3)}°
        </p>
        <button
          type="button"
          onClick={() => setMode(mode === "globe" ? "flat" : "globe")}
          className="pointer-events-auto mt-1.5 rounded-full border border-white/20 px-2 py-0.5 text-[9px] uppercase tracking-wide text-white/70 transition-colors hover:bg-white/10"
        >
          {mode === "globe" ? t("map.flat") : t("map.globe")}
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-center text-[11px] text-white/80 backdrop-blur">
        {t("map.hint")}
      </div>
    </div>
  );
}
