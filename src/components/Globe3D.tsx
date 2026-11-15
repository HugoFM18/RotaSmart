import { useEffect, useRef, useState } from "react";
import type { Map as GlobeMap, GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "../store";
import { pickLocation } from "../pick";
import { wrapLongitude } from "../globe";
import { WorldLayers } from "../map/WorldLayers";
import type { BoundaryStatus } from "../map/WorldLayers";
import { IMAGERY_PROVIDERS, BOUNDARY_ATTRIBUTION } from "../map/imagery";

const empty = { type: "FeatureCollection" as const, features: [] };

function focusRegion(map: GlobeMap, duration = 650) {
  const { lat, lon, bbox } = useStore.getState();
  if (bbox) {
    const east = bbox[3] < bbox[1] ? bbox[3] + 360 : bbox[3];
    map.fitBounds([[bbox[1], Math.max(-85, bbox[0])], [east, Math.min(85, bbox[2])]], {
      padding: { left: 28, right: 52, top: map.getContainer().clientWidth < 500 ? 112 : 82, bottom: 60 },
      maxZoom: 12, duration,
    });
  } else map.flyTo({ center: [lon, lat], zoom: Math.max(6, map.getZoom()), duration });
}

export function Globe3D({ flat = false, onRequestFlat }: { flat?: boolean; onRequestFlat?: () => void }) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GlobeMap | null>(null);
  const boundariesRef = useRef<WorldLayers | null>(null);
  const fallbackRef = useRef(onRequestFlat);
  fallbackRef.current = onRequestFlat;
  const flatRef = useRef(flat);
  flatRef.current = flat;
  const providerRef = useRef(0);
  const providerErrors = useRef(0);
  const applyImageryRef = useRef<((index: number) => void) | null>(null);
  const lat = useStore(s => s.lat);
  const lon = useStore(s => s.lon);
  const polygon = useStore(s => s.polygon);
  const flyToken = useStore(s => s.flyToken);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1.8);
  const [boundaryStatus, setBoundaryStatus] = useState<BoundaryStatus>("loading");
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let active = true;
    let observer: ResizeObserver | undefined;
    let map: GlobeMap | undefined;
    void import("maplibre-gl").then(lib => {
      if (!active || !containerRef.current) return;
      try {
        const initial = useStore.getState();
        map = new lib.Map({
          container: containerRef.current,
          center: [initial.lon, initial.lat], zoom: 1.8, minZoom: 0.5, maxZoom: 19,
          maxTileCacheSize: 96, maxPitch: 60,
          attributionControl: false,
          style: {
            version: 8, projection: { type: "globe" },
            glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
            sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#0B1725" } }],
            sky: { "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
              "sky-color": "#081320", "horizon-color": "#86BAD0" },
          },
        });
        mapRef.current = map;
        map.addControl(new lib.AttributionControl({ compact: true, customAttribution: BOUNDARY_ATTRIBUTION }), "bottom-right");
        map.getCanvas().setAttribute("aria-label", t("map.accessibleGlobe"));
        map.getCanvas().style.cursor = "grab";
        observer = new ResizeObserver(() => { if (active) map?.resize(); });
        observer.observe(containerRef.current);

        const applyImagery = (index: number) => {
          if (!active || !map) return;
          for (let i = 0; i < IMAGERY_PROVIDERS.length; i++) {
            if (map.getLayer(`imagery-${i}`)) map.removeLayer(`imagery-${i}`);
            if (map.getSource(`imagery-${i}`)) map.removeSource(`imagery-${i}`);
          }
          providerRef.current = index;
          providerErrors.current = 0;
          const provider = IMAGERY_PROVIDERS[index];
          map.addSource(`imagery-${index}`, { type: "raster", tiles: [provider.url], tileSize: 256,
            maxzoom: provider.maxZoom, attribution: provider.attribution });
          const before = map.getLayer("world-countries-halo") ? "world-countries-halo" : map.getLayer("selected-fill") ? "selected-fill" : undefined;
          map.addLayer({ id: `imagery-${index}`, type: "raster", source: `imagery-${index}`,
            paint: { "raster-fade-duration": 120, "raster-saturation": 0.05 } }, before);
        };
        applyImageryRef.current = applyImagery;
        map.on("style.load", () => {
          if (!active || !map) return;
          applyImagery(0);
          map.addSource("selected-area", { type: "geojson", data: empty });
          map.addLayer({ id: "selected-fill", type: "fill", source: "selected-area", paint: { "fill-color": "#FFCF42", "fill-opacity": 0.15 } });
          map.addLayer({ id: "selected-line-halo", type: "line", source: "selected-area", paint: { "line-color": "#332607", "line-width": 5, "line-opacity": 0.7 } });
          map.addLayer({ id: "selected-line", type: "line", source: "selected-area", paint: { "line-color": "#FFCF42", "line-width": 2.5 } });
          map.addSource("selected-point", { type: "geojson", data: empty });
          map.addLayer({ id: "selected-point-halo", type: "circle", source: "selected-point", paint: { "circle-radius": 11, "circle-color": "#FFCF42", "circle-opacity": 0.25 } });
          map.addLayer({ id: "selected-point", type: "circle", source: "selected-point", paint: { "circle-radius": 5, "circle-color": "#F5B800", "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 2 } });
        });
        map.on("load", () => {
          if (!active || !map) return;
          setReady(true);
          const boundaries = new WorldLayers(map, value => { if (active) setBoundaryStatus(value); });
          boundariesRef.current = boundaries;
          void boundaries.start();
          if (useStore.getState().flyToken) focusRegion(map, 0);
        });
        map.on("zoom", () => { if (active && map) setZoom(map.getZoom()); });
        map.on("click", (event: MapMouseEvent) => {
          if (!map) return;
          // Reject clicks on space outside the planet, including clamped inverse projections.
          const pixel = map.project(event.lngLat);
          if (Math.hypot(pixel.x - event.point.x, pixel.y - event.point.y) > 3) return;
          pickLocation(event.lngLat.lat, wrapLongitude(event.lngLat.lng), flatRef.current || map.getZoom() >= 7 ? 10 : 6);
        });
        map.on("error", event => {
          if (!active || !map) return;
          const sourceId = (event as { sourceId?: string }).sourceId;
          if (sourceId?.startsWith("world-")) { setBoundaryStatus("error"); return; }
          if (sourceId !== `imagery-${providerRef.current}`) return;
          providerErrors.current++;
          if (providerErrors.current < 4) return;
          if (providerRef.current < IMAGERY_PROVIDERS.length - 1) applyImagery(providerRef.current + 1);
          else setImageError(true);
        });
        map.on("webglcontextlost", () => { if (active) fallbackRef.current?.(); });
      } catch { if (active) fallbackRef.current?.(); }
    }).catch(() => { if (active) fallbackRef.current?.(); });
    return () => {
      active = false;
      observer?.disconnect();
      boundariesRef.current?.dispose();
      boundariesRef.current = null;
      map?.remove();
      mapRef.current = null;
    };
    // The renderer is created once. Store updates only change its sources and camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource("selected-point") as GeoJSONSource)?.setData({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [lon, lat] } });
    (map.getSource("selected-area") as GeoJSONSource)?.setData(polygon ? { type: "Feature", properties: {}, geometry: polygon } : empty);
  }, [lat, lon, polygon, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && ready && flyToken) focusRegion(map);
  }, [flyToken, ready]);

  useEffect(() => { mapRef.current?.getCanvas().setAttribute("aria-label", t("map.accessibleGlobe")); }, [t]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setProjection({ type: flat ? "mercator" : "globe" });
    boundariesRef.current?.schedule();
  }, [flat, ready]);

  return <div className="absolute inset-0 overflow-hidden bg-[#081320]">
    <div ref={containerRef} className="absolute inset-0 h-full w-full" data-map={flat ? "satellite-flat" : "satellite-globe"} />
    <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
      {[
        { icon: Plus, label: t("map.zoomIn"), fn: () => mapRef.current?.zoomIn({ duration: 250 }) },
        { icon: Minus, label: t("map.zoomOut"), fn: () => mapRef.current?.zoomOut({ duration: 250 }) },
        { icon: Maximize2, label: t("map.focusArea"), fn: () => { if (mapRef.current) focusRegion(mapRef.current); } },
        { icon: RotateCcw, label: t("map.resetView"), fn: () => mapRef.current?.flyTo({ center: [lon, lat], zoom: 1.8, bearing: 0, pitch: 0, duration: 650 }) },
      ].map(({ icon: Icon, label, fn }) => <button key={label} type="button" onClick={fn} title={label} aria-label={label}
        className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-black/60 text-white/90 backdrop-blur transition-colors hover:bg-white/20">
        <Icon size={15} />
      </button>)}
    </div>
    {(!ready || imageError || boundaryStatus !== "ready") && <div role="status" className="absolute bottom-12 left-3 z-10 max-w-[270px] rounded-lg border border-white/15 bg-black/70 px-3 py-2 text-[11px] text-white/90 backdrop-blur">
      {imageError ? t("map.imageError") : !ready ? t("map.loadingGlobe") : boundaryStatus === "error" ? t("map.detailError") : t("map.loadingDetail")}
      {(imageError || boundaryStatus === "error") && <button type="button" className="ml-2 underline" onClick={() => {
        if (imageError) { setImageError(false); applyImageryRef.current?.(0); }
        boundariesRef.current?.retry();
      }}>{t("map.retry")}</button>}
    </div>}
    <div className="pointer-events-none absolute bottom-9 right-3 rounded-lg border border-white/10 bg-black/55 px-2 py-1 text-[9px] uppercase tracking-wide text-white/75">
      {t("map.zoom")} {zoom.toFixed(1)}
    </div>
  </div>;
}
