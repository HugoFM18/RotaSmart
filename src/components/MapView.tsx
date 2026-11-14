import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTranslation } from "react-i18next";
import { useStore, type LayerId } from "../store";
import { waterStress } from "../engine";
import { slug } from "../utils";

type Props = {
  geo: any;
  index: { id: string; name: string; aridity: number }[];
  selected: string | null;
  onSelect: (id: string) => void;
};

const GIBS: Record<string, { layer: string; date: string; ext: string; level: number; opacity: number }> = {
  ndvi: { layer: "MODIS_Terra_L3_NDVI_16Day", date: "2026-10-20", ext: "png", level: 9, opacity: 0.7 },
  precip: { layer: "IMERG_Precipitation_Rate", date: "2026-11-10", ext: "png", level: 6, opacity: 0.6 },
  temp: { layer: "MODIS_Terra_L3_Land_Surface_Temp_Daily_Day", date: "2026-11-10", ext: "png", level: 7, opacity: 0.6 },
};

const LAYER_OPTIONS: (LayerId | "none")[] = ["none", "ndvi", "precip", "temp"];

export function MapView({ geo, index, selected, onSelect }: Props) {
  const { t, i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onSelectRef = useRef(onSelect);
  const [loaded, setLoaded] = useState(false);
  const layer = useStore((s) => s.layer);
  const setLayer = useStore((s) => s.setLayer);

  onSelectRef.current = onSelect;

  const merged = useMemo(() => {
    if (!geo || !index) return null;
    const byId = new Map(index.map((e) => [e.id, e]));
    return {
      type: "FeatureCollection",
      features: geo.features.map((f: any) => {
        const name = f.properties?.shapeName ?? "";
        const id = slug(name);
        const entry = byId.get(id);
        return {
          ...f,
          id,
          properties: {
            ...f.properties,
            id,
            name,
            stress: entry ? waterStress(entry.aridity) : 0.5,
          },
        };
      }),
    };
  }, [geo, index]);

  const mergedRef = useRef(merged);
  mergedRef.current = merged;

  /* --- crear mapa (una vez) --- */
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          basemap: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
              "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
              "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a> · Tiles: NASA GIBS',
          },
        },
        layers: [{ id: "basemap", type: "raster", source: "basemap" }],
      },
      center: [-75.55, 2.55],
      zoom: 7.4,
      maxZoom: 12,
      minZoom: 5,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("load", () => {
      map.fitBounds(
        [
          [-76.75, 1.35],
          [-74.25, 3.95],
        ],
        { padding: 24, duration: 0 },
      );
      setLoaded(true);
      const data = mergedRef.current;
      if (data) addDataLayers(map, data);
    });

    mapRef.current = map;

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setLoaded(false);
    };
  }, []);

  /* --- capas de datos + interacción --- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !merged) return;

    const src = map.getSource("muni") as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(merged as any);
      return;
    }
    addDataLayers(map, merged);
  }, [loaded, merged]);

  /* --- municipio seleccionado --- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !map.getLayer("muni-selected")) return;
    map.setFilter("muni-selected", ["==", ["get", "id"], selected ?? ""]);
  }, [selected, loaded, merged]);

  /* --- capa satelital --- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;

    if (map.getLayer("gibs-layer")) map.removeLayer("gibs-layer");
    if (map.getSource("gibs")) map.removeSource("gibs");

    if (!layer) return;
    const cfg = GIBS[layer];
    if (!cfg) return;

    const url =
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${cfg.layer}/default/${cfg.date}` +
      `/GoogleMapsCompatible_Level${cfg.level}/{z}/{y}/{x}.${cfg.ext}`;

    map.addSource("gibs", { type: "raster", tiles: [url], tileSize: 256 });
    map.addLayer(
      {
        id: "gibs-layer",
        type: "raster",
        source: "gibs",
        paint: { "raster-opacity": cfg.opacity },
      },
      map.getLayer("muni-fill") ? "muni-fill" : undefined,
    );
  }, [layer, loaded]);

  function addDataLayers(map: maplibregl.Map, data: any) {
    map.addSource("muni", { type: "geojson", data });

    map.addLayer({
      id: "muni-fill",
      type: "fill",
      source: "muni",
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "stress"],
          0,
          "#8FB49A",
          0.45,
          "#C6C98F",
          0.72,
          "#C77D13",
          1,
          "#A8432C",
        ],
        "fill-opacity": 0.82,
      },
    });

    map.addLayer({
      id: "muni-line",
      type: "line",
      source: "muni",
      paint: {
        "line-color": "#171A17",
        "line-opacity": 0.16,
        "line-width": 0.7,
      },
    });

    map.addLayer({
      id: "muni-selected",
      type: "line",
      source: "muni",
      paint: { "line-color": "#171A17", "line-width": 2.4 },
      filter: ["==", ["get", "id"], ""],
    });

    map.on("click", "muni-fill", (e) => {
      const id = e.features?.[0]?.properties?.id;
      if (id) onSelectRef.current(id);
    });

    map.on("mouseenter", "muni-fill", (e) => {
      map.getCanvas().style.cursor = "pointer";
      const f = e.features?.[0];
      if (!f) return;
      const name = f.properties?.name ?? "";
      const stress = Math.round(Number(f.properties?.stress ?? 0) * 100);
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 10,
      })
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="font-size:12px;font-weight:600">${name}</div>
           <div style="font-size:11px;color:#6B7268">${i18n.t("map.legend")}: ${stress}%</div>`,
        )
        .addTo(map);
    });

    map.on("mousemove", "muni-fill", (e) => {
      popupRef.current?.setLngLat(e.lngLat);
    });

    map.on("mouseleave", "muni-fill", () => {
      map.getCanvas().style.cursor = "";
      popupRef.current?.remove();
      popupRef.current = null;
    });
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />

      {/* selector de capas */}
      <div className="absolute left-3 top-3 z-10 rounded-xl border border-line bg-paper/95 p-1 shadow-sm backdrop-blur">
        <p className="px-2 pb-1 pt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
          {t("map.layers")}
        </p>
        <div className="flex flex-col">
          {LAYER_OPTIONS.map((opt) => {
            const active = opt === "none" ? layer === null : layer === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setLayer(opt === "none" ? null : (opt as LayerId))}
                className={`rounded-lg px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                  active ? "bg-leaf text-bone" : "text-ink hover:bg-leaf-soft"
                }`}
              >
                {t(`map.${opt}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* leyenda */}
      <div className="absolute bottom-4 left-3 z-10 rounded-xl border border-line bg-paper/95 px-3 py-2 shadow-sm backdrop-blur">
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
          {t("map.legend")}
        </p>
        <div
          className="h-2 w-40 rounded-full"
          style={{
            background:
              "linear-gradient(90deg,#8FB49A 0%,#C6C98F 45%,#C77D13 72%,#A8432C 100%)",
          }}
        />
        <div className="mt-1 flex justify-between text-[9px] text-muted">
          <span>{t("map.low")}</span>
          <span>{t("map.high")}</span>
        </div>
      </div>
    </div>
  );
}
