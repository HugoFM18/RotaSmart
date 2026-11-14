import { useEffect, useMemo, useRef, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule, geoDistance, geoArea } from "d3-geo";
import { feature } from "topojson-client";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "../store";
import { pickLocation } from "../pick";

let globePromise: Promise<any> | null = null;
function loadGlobe(): Promise<any> {
  if (!globePromise) {
    const base = import.meta.env.BASE_URL;
    globePromise = Promise.all([
      fetch(`${base}data/globe.json`).then((r) => r.json()),
      // Países desde world-atlas (TopoJSON): orientación correcta para d3-geo
      // y ~10k puntos, lo que mantiene el arrastre fluido.
      fetch(`${base}data/world-110m.json`)
        .then((r) => r.json())
        .then((topo) => feature(topo, topo.objects.countries)),
    ])
      .then(([layers, countries]) => ({ ...layers, countries }))
      .catch(() => null);
  }
  return globePromise;
}

/* Paleta editorial: tierra hueso sobre ocÃ©ano azul profundo */
const OCEAN_from = "#1D3E5E";
const OCEAN_to = "#0A1826";
const LAND = "#EDE7D8";
const LAND_STROKE = "rgba(88,72,44,0.85)";
const ADMIN_STROKE = "rgba(112,96,64,0.45)";
const RIVER = "rgba(38,104,146,0.95)";
const LAKE = "#4A93C6";
const GRAT_LAND = "rgba(90,78,52,0.13)";
const GRAT_OCEAN = "rgba(255,255,255,0.05)";
const AREA_FILL = "rgba(255,201,64,0.30)";
const AREA_STROKE = "#C9860A";
const LABEL = "#2A2418";
const LABEL_HALO = "rgba(255,252,242,0.92)";

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

export function Globe3D({ onRequestFlat }: { onRequestFlat?: () => void }) {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);

  const lat = useStore((s) => s.lat);
  const lon = useStore((s) => s.lon);
  const polygon = useStore((s) => s.polygon);
  const bbox = useStore((s) => s.bbox);
  const flyToken = useStore((s) => s.flyToken);

  const [size, setSize] = useState({ w: 900, h: 700 });
  const [data, setData] = useState<any>(null);
  const [rotation, setRotation] = useState<[number, number]>([75.28, -2.93]);
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ x: number; y: number; rot: [number, number]; moved: number } | null>(null);

  useEffect(() => {
    loadGlobe().then(setData);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* encajar la zona seleccionada */
  useEffect(() => {
    if (flyToken === 0) return;
    const centerLon = bbox ? (bbox[1] + bbox[3]) / 2 : lon;
    const centerLat = bbox ? (bbox[0] + bbox[2]) / 2 : lat;
    const span = bbox ? Math.max(bbox[3] - bbox[1], bbox[2] - bbox[0]) : 6;
    const target = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (180 / Math.max(span, 0.05)) * 0.42));
    setRotation([-centerLon, -centerLat]);
    setZoom(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToken]);

  const radius = Math.max(60, Math.min(size.w, size.h) / 2 - 22);
  const cx = size.w / 2;
  const cy = size.h / 2;

  /* La proyecciÃ³n NO depende del zoom: el zoom es un transform SVG.
     AsÃ­ acercar/alejar es instantÃ¡neo y no recalcula la geometrÃ­a. */
  const projection = useMemo(
    () =>
      geoOrthographic()
        .translate([cx, cy])
        .scale(radius)
        .rotate([rotation[0], rotation[1], 0])
        .clipAngle(90),
    [cx, cy, radius, rotation],
  );

  const path = useMemo(() => geoPath(projection), [projection]);

  const shapes = useMemo(() => {
    if (!data) return null;
    const step = zoom > 8 ? 1 : zoom > 3 ? 2 : 10;
    return {
      sphere: path({ type: "Sphere" } as any) ?? "",
      graticule: path(geoGraticule().step([step, step])()) ?? "",
      countries: path(data.countries) ?? "",
      admin1: path(data.admin1) ?? "",
      rivers: path(data.rivers) ?? "",
      lakes: path(data.lakes) ?? "",
    };
  }, [data, path, zoom]);

  /* Nominatim devuelve anillos en convenciÃ³n RFC 7946; d3-geo usa la esfÃ©rica
     (opuesta). Si el Ã¡rea supera media esfera, invertimos los anillos. */
  const areaFeature = useMemo(() => {
    if (!polygon) return null;
    const geometry = JSON.parse(JSON.stringify(polygon));
    const polys =
      geometry.type === "Polygon"
        ? [geometry.coordinates]
        : geometry.type === "MultiPolygon"
          ? geometry.coordinates
          : null;
    if (!polys) return null;
    for (const poly of polys) {
      const probe = {
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: poly },
      };
      if (geoArea(probe as any) > Math.PI * 2) {
        for (const ring of poly) ring.reverse();
      }
    }
    return { type: "Feature", properties: {}, geometry } as any;
  }, [polygon]);

  const areaPath = useMemo(
    () => (areaFeature && path ? path(areaFeature) ?? "" : ""),
    [areaFeature, path],
  );

  /* ciudades visibles, con etiquetas segÃºn el nivel de zoom */
  const cityPoints = useMemo(() => {
    if (!data?.cities) return [];
    const center: [number, number] = [-rotation[0], -rotation[1]];
    const minPop = zoom > 5 ? 80000 : zoom > 2.5 ? 700000 : 2500000;
    return data.cities.features
      .filter((f: any) => (f.properties.pop ?? 0) >= minPop)
      .map((f: any) => {
        const [flon, flat] = f.geometry.coordinates;
        if (geoDistance([flon, flat], center) > Math.PI / 2 - 0.06) return null;
        const p = projection([flon, flat]);
        if (!p) return null;
        const pop: number = f.properties.pop;
        return {
          name: f.properties.name as string,
          pop,
          x: cx + (p[0] - cx) * zoom,
          y: cy + (p[1] - cy) * zoom,
          r: pop > 8000000 ? 3 : pop > 3000000 ? 2.3 : pop > 1000000 ? 1.8 : 1.3,
          label: zoom > 2.4 || pop > 5000000,
        } as const;
      })
      .filter(Boolean)
      .filter((c: any) => c.x > -60 && c.x < size.w + 60 && c.y > -30 && c.y < size.h + 30)
      .sort((a: any, b: any) => b.pop - a.pop)
      .slice(0, zoom > 5 ? 34 : 18);
  }, [data, projection, rotation, zoom, cx, cy, size.w, size.h]);

  const marker = useMemo(() => {
    const p = projection([lon, lat]);
    if (!p) return null;
    const center: [number, number] = [-rotation[0], -rotation[1]];
    if (geoDistance([lon, lat], center) >= Math.PI / 2) return null;
    return { x: cx + (p[0] - cx) * zoom, y: cy + (p[1] - cy) * zoom };
  }, [projection, lon, lat, rotation, zoom, cx, cy]);

  /* rotaciÃ³n con raF para no saturar el hilo */
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.moved = Math.max(d.moved, Math.abs(dx) + Math.abs(dy));
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const k = 0.28 / zoom;
      setRotation([d.rot[0] + dx * k, Math.max(-85, Math.min(85, d.rot[1] - dy * k))]);
    });
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.moved > 6) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const gx = (e.clientX - rect.left - cx) / zoom + cx;
    const gy = (e.clientY - rect.top - cy) / zoom + cy;
    const inv = projection.invert?.([gx, gy]);
    if (inv) pickLocation(inv[1], inv[0], 6);
  };

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * (e.deltaY > 0 ? 0.85 : 1.18))));
  };

  const zoomBy = (factor: number) =>
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor)));

  const reset = () => {
    setZoom(1);
    setRotation([-lon, -lat]);
  };

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <svg
        width={size.w}
        height={size.h}
        className="block touch-none cursor-grab select-none active:cursor-grabbing"
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          dragRef.current = { x: e.clientX, y: e.clientY, rot: rotation, moved: 0 };
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <defs>
          <radialGradient id="g-ocean" cx="34%" cy="28%" r="78%">
            <stop offset="0%" stopColor={OCEAN_from} />
            <stop offset="65%" stopColor="#12293F" />
            <stop offset="100%" stopColor={OCEAN_to} />
          </radialGradient>
          <radialGradient id="g-halo" cx="50%" cy="50%" r="50%">
            <stop offset="82%" stopColor="rgba(90,150,200,0.20)" />
            <stop offset="93%" stopColor="rgba(90,150,200,0.08)" />
            <stop offset="100%" stopColor="rgba(90,150,200,0)" />
          </radialGradient>
          {/* limbo: aclara el centro y oscurece el borde para dar volumen */}
          <radialGradient id="g-shade" cx="38%" cy="34%" r="72%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.10)" />
            <stop offset="55%" stopColor="rgba(255,255,255,0)" />
            <stop offset="86%" stopColor="rgba(6,14,24,0.22)" />
            <stop offset="100%" stopColor="rgba(6,14,24,0.42)" />
          </radialGradient>
          <clipPath id="g-sphere">
            <circle cx={cx} cy={cy} r={radius} />
          </clipPath>
        </defs>

        {/* atmÃ³sfera */}
        <circle cx={cx} cy={cy} r={radius + 16} fill="url(#g-halo)" />

        {shapes && (
          <>
            {/* ocÃ©ano base */}
            <path d={shapes.sphere} fill="url(#g-ocean)" />

            <g clipPath="url(#g-sphere)">
              {/* todo el contenido se escala con un transform: el zoom no recalcula nada */}
              <g transform={`translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy})`}>
                {/* retÃ­cula */}
                <path d={shapes.graticule} fill="none" stroke={GRAT_OCEAN} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />

                {/* tierra y lagos con evenodd: el relleno no depende del sentido de los anillos */}
                <path d={shapes.countries} fill={LAND} stroke="none" strokeLinejoin="round" />
                <path d={shapes.lakes} fill={LAKE} stroke="none" />

                {/* rÃ­os y retÃ­cula de tierra */}
                <path d={shapes.rivers} fill="none" stroke={RIVER} strokeWidth={Math.min(1.8, 0.7 + zoom * 0.09)} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                <path d={shapes.graticule} fill="none" stroke={GRAT_LAND} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />

                {/* lÃ­mites de paÃ­ses siempre; subdivisiones solo al acercar
                    (el conjunto de subdivisiones es incompleto a escala mundial) */}
                {zoom > 2.5 && (
                  <path d={shapes.admin1} fill="none" stroke={ADMIN_STROKE} strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
                )}
                <path
                  d={shapes.countries}
                  fill="none"
                  stroke={LAND_STROKE}
                  strokeWidth={Math.min(1.9, 0.85 + zoom * 0.11)}
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                />

                {areaPath && (
                  <path
                    d={areaPath}
                    fill={AREA_FILL}
                    fillRule="evenodd"
                    stroke={AREA_STROKE}
                    strokeWidth={2.6}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </g>

              {/* sombreado de limbo: da volumen esfÃ©rico a cualquier zoom */}
              <circle cx={cx} cy={cy} r={radius} fill="url(#g-shade)" pointerEvents="none" />
            </g>

            {/* borde del planeta */}
            <path d={shapes.sphere} fill="none" stroke="rgba(150,195,230,0.30)" strokeWidth={1} />
          </>
        )}

        {/* ciudades y etiquetas: tamaÃ±o constante en pantalla */}
        {cityPoints.map((c: any, i: number) => (
          <g key={`${c.name}-${i}`}>
            <circle cx={c.x} cy={c.y} r={c.r} fill="#2A2A24" stroke={LABEL} strokeWidth={0.7} />
            {c.label && (
              <text
                x={c.x + c.r + 2.5}
                y={c.y + 2.4}
                fontSize={9}
                fill={LABEL}
                stroke={LABEL_HALO}
                strokeWidth={2.4}
                paintOrder="stroke"
                style={{ fontFamily: "var(--font-sans)", letterSpacing: "0.01em" }}
              >
                {c.name}
              </text>
            )}
          </g>
        ))}

        {/* marcador del punto analizado */}
        {marker && (
          <g pointerEvents="none">
            <circle cx={marker.x} cy={marker.y} r={11} fill="rgba(217,149,0,0.22)" />
            <circle cx={marker.x} cy={marker.y} r={7} fill="none" stroke={AREA_STROKE} strokeOpacity={0.55} strokeWidth={1} />
            <circle cx={marker.x} cy={marker.y} r={3.6} fill="#D99500" stroke="#FFFDF6" strokeWidth={1.6} />
          </g>
        )}
      </svg>

      {/* controles de zoom */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
        {[
          { icon: Plus, label: t("map.zoomIn"), fn: () => zoomBy(1.5) },
          { icon: Minus, label: t("map.zoomOut"), fn: () => zoomBy(1 / 1.5) },
          { icon: Maximize2, label: t("map.resetView"), fn: reset },
        ].map(({ icon: Icon, label, fn }) => (
          <button
            key={label}
            type="button"
            onClick={fn}
            aria-label={label}
            title={label}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-black/45 text-white/80 backdrop-blur transition-colors hover:bg-white/15 hover:text-white"
          >
            <Icon size={14} strokeWidth={1.9} />
          </button>
        ))}
      </div>

      {/* indicador de zoom */}
      <div className="pointer-events-none absolute bottom-4 right-3 z-10 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-white/55 backdrop-blur">
        {t("map.zoom")} ×{zoom.toFixed(zoom < 10 ? 1 : 0)}
      </div>

      {/* al acercar, ofrecer el detalle real del mapa 2D */}
      {zoom >= 4.5 && onRequestFlat && (
        <button
          type="button"
          onClick={onRequestFlat}
          className="absolute bottom-14 left-1/2 z-10 -translate-x-1/2 rounded-full border border-harvest/40 bg-[#1a1408]/70 px-3.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-harvest backdrop-blur transition-colors hover:bg-harvest/20"
        >
          {t("map.detail2d")}
        </button>
      )}
    </div>
  );
}

