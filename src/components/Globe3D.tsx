import { useEffect, useMemo, useRef, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule, geoDistance, geoArea } from "d3-geo";
import { feature, mesh } from "topojson-client";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "../store";
import { pickLocation } from "../pick";
import { clampZoom, globePoint, indexFeatures, regionView, visibleFeatures, wrapLongitude } from "../globe";

let globePromise: Promise<any> | null = null;
function loadGlobe(): Promise<any> {
  if (!globePromise) {
    const base = import.meta.env.BASE_URL;
    globePromise = Promise.all([
      fetch(`${base}data/globe.json`).then((r) => { if (!r.ok) throw new Error("Globe data unavailable"); return r.json(); }),
      // Países desde world-atlas (TopoJSON): orientación correcta para d3-geo
      // y ~10k puntos, lo que mantiene el arrastre fluido.
      fetch(`${base}data/world-110m.json`)
        .then((r) => { if (!r.ok) throw new Error("World data unavailable"); return r.json(); })
        .then((topo) => ({ countries: feature(topo, topo.objects.countries),
          borders: mesh(topo, topo.objects.countries, (a, b) => a !== b) })),
    ])
      .then(([layers, world]) => {
        const combined = { ...layers, ...world };
        return { ...combined, index: Object.fromEntries(["countries", "admin1", "rivers", "lakes"]
          .map((key) => [key, indexFeatures(combined[key])])) };
      })
      .catch(() => { globePromise = null; return null; });
  }
  return globePromise;
}

/* Paleta editorial: tierra hueso sobre ocÃ©ano azul profundo */
const OCEAN_from = "#1D3E5E";
const OCEAN_to = "#0A1826";
const LAND = "#C9D8BA";
const LAND_STROKE = "rgba(88,72,44,0.85)";
const ADMIN_STROKE = "rgba(112,96,64,0.45)";
const RIVER = "rgba(38,104,146,0.95)";
const LAKE = "#4A93C6";
const GRAT_LAND = "rgba(90,78,52,0.13)";
const GRAT_OCEAN = "rgba(255,255,255,0.05)";
const AREA_FILL = "rgba(255,201,64,0.24)";
const AREA_STROKE = "#FFCC55";
const LABEL = "#2A2418";
const LABEL_HALO = "rgba(255,252,242,0.92)";
const GRATICULE = geoGraticule().step([10, 10])();

export function Globe3D({ onRequestFlat }: { onRequestFlat?: () => void }) {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

  const lat = useStore((s) => s.lat);
  const lon = useStore((s) => s.lon);
  const polygon = useStore((s) => s.polygon);
  const bbox = useStore((s) => s.bbox);
  const flyToken = useStore((s) => s.flyToken);

  const [size, setSize] = useState({ w: 900, h: 700 });
  const [data, setData] = useState<any>(null);
  const [rotation, setRotation] = useState<[number, number]>(() => [-useStore.getState().lon, -useStore.getState().lat]);
  const [zoom, setZoom] = useState(1);
  const [loadFailed, setLoadFailed] = useState(false);
  const flightRef = useRef(0);
  const viewRef = useRef({ rotation, zoom });
  viewRef.current = { rotation, zoom };
  const animateTo = (targetRotation: [number, number], targetZoom: number) => {
    cancelAnimationFrame(flightRef.current);
    const start = viewRef.current;
    const delta = wrapLongitude(targetRotation[0] - start.rotation[0]);
    const started = performance.now();
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650;
    const frame = (now: number) => {
      const progress = duration ? Math.min(1, (now - started) / duration) : 1;
      const ease = 1 - (1 - progress) ** 3;
      setRotation([start.rotation[0] + delta * ease, start.rotation[1] + (targetRotation[1] - start.rotation[1]) * ease]);
      setZoom(Math.exp(Math.log(start.zoom) + Math.log(targetZoom / start.zoom) * ease));
      if (progress < 1) flightRef.current = requestAnimationFrame(frame);
    };
    flightRef.current = requestAnimationFrame(frame);
  };
  const dragRef = useRef<{ id: number; x: number; y: number; rot: [number, number]; moved: number } | null>(null);

  useEffect(() => {
    let active = true;
    loadGlobe().then((value) => { if (active) { setData(value); setLoadFailed(!value); } });
    return () => { active = false; cancelAnimationFrame(rafRef.current); cancelAnimationFrame(flightRef.current); };
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
    const target = regionView(lat, lon, bbox, wrapRef.current?.clientWidth || size.w, wrapRef.current?.clientHeight || size.h);
    animateTo(target.rotation, target.zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToken]);

  const radius = Math.max(60, Math.min(size.w, size.h) / 2 - 22);
  const cx = size.w / 2;
  const cy = size.h / 2;

  // Scale the actual projection: sphere, boundaries, labels and hit testing stay aligned.
  const projection = useMemo(
    () =>
      geoOrthographic()
        .translate([cx, cy])
        .scale(radius * zoom)
        .rotate([rotation[0], rotation[1], 0])
        .clipAngle(Math.min(90, Math.asin(Math.min(1, Math.hypot(cx, cy) / (radius * zoom))) * 180 / Math.PI + 1))
        .clipExtent([[0, 0], [size.w, size.h]])
        .precision(0.6),
    [cx, cy, radius, rotation, zoom],
  );

  const path = useMemo(() => geoPath(projection), [projection]);

  const shapes = useMemo(() => {
    if (!data) return null;
    const center: [number, number] = [-rotation[0], -rotation[1]];
    const angle = Math.asin(Math.min(1, Math.hypot(cx, cy) / (radius * zoom))) + .02;
    const visible = (key: string) => visibleFeatures(data.index[key], center, angle);
    const countries = path(visible("countries")) ?? "";
    return {
      sphere: path({ type: "Sphere" } as any) ?? "",
      graticule: path(GRATICULE) ?? "",
      countries,
      borders: zoom > 2 ? countries : path(data.borders) ?? "",
      admin1: zoom > 2.5 ? path(visible("admin1")) ?? "" : "",
      rivers: zoom > 2 ? path(visible("rivers")) ?? "" : "",
      lakes: path(visible("lakes")) ?? "",
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
    const candidates = data.cities.features
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
          x: p[0],
          y: p[1],
          r: pop > 8000000 ? 3 : pop > 3000000 ? 2.3 : pop > 1000000 ? 1.8 : 1.3,
          label: zoom > 2.4 || pop > 5000000,
        } as const;
      })
      .filter(Boolean)
      .filter((c: any) => c.x > -60 && c.x < size.w + 60 && c.y > -30 && c.y < size.h + 30)
      .sort((a: any, b: any) => b.pop - a.pop)
      .slice(0, 80);
    const visible: typeof candidates = [];
    for (const city of candidates) {
      if (visible.some((other: any) => Math.abs(city.y - other.y) < 16 && Math.abs(city.x - other.x) < Math.max(city.name.length, other.name.length) * 6 + 14)) continue;
      visible.push(city);
      if (visible.length >= (zoom > 5 ? 34 : 18)) break;
    }
    return visible;
  }, [data, projection, rotation, zoom, cx, cy, size.w, size.h]);

  const marker = useMemo(() => {
    const p = projection([lon, lat]);
    if (!p) return null;
    const center: [number, number] = [-rotation[0], -rotation[1]];
    if (geoDistance([lon, lat], center) >= Math.PI / 2) return null;
    return { x: p[0], y: p[1] };
  }, [projection, lon, lat, rotation, zoom, cx, cy]);

  /* rotaciÃ³n con raF para no saturar el hilo */
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const points = [...pointersRef.current.values()];
    if (points.length > 1 && pinchRef.current) {
      if (dragRef.current) dragRef.current.moved = 100;
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      setZoom(clampZoom(pinchRef.current.zoom * distance / pinchRef.current.distance));
      return;
    }
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.moved = Math.max(d.moved, Math.abs(dx) + Math.abs(dy));
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const k = 90 / (radius * zoom);
      if (dragRef.current !== d) return;
      setRotation([d.rot[0] + dx * k, Math.max(-90, Math.min(90, d.rot[1] - dy * k))]);
    });
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId);
    pinchRef.current = null;
    const d = dragRef.current;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    if (!d || d.id !== e.pointerId || d.moved > 6 || e.type === 'pointercancel') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const gx = e.clientX - rect.left;
    const gy = e.clientY - rect.top;
    const inv = globePoint(gx, gy, size.w, size.h, radius, rotation, zoom);
    if (inv) {
      animateTo([-inv[0], -inv[1]], Math.max(6, zoom));
      pickLocation(inv[1], inv[0], 10);
    }
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      cancelAnimationFrame(flightRef.current);
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.h : 1);
      setZoom((z) => clampZoom(z * Math.exp(-delta * .002)));
    };
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  }, [size.h]);

  const zoomBy = (factor: number) =>
    animateTo(viewRef.current.rotation, clampZoom(viewRef.current.zoom * factor));

  const reset = () => {
    animateTo([-lon, -lat], 1);
  };

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_center,#18364d,#080f1c)]">
      <svg
        width={size.w}
        height={size.h}
        className="block touch-none cursor-grab select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 active:cursor-grabbing"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          cancelAnimationFrame(flightRef.current);
          e.currentTarget.setPointerCapture(e.pointerId);
          pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const points = [...pointersRef.current.values()];
          if (points.length > 1) {
            if (dragRef.current) dragRef.current.moved = 100;
            pinchRef.current = { distance: Math.max(1, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)), zoom };
            return;
          }
          dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, rot: rotation, moved: 0 };
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={(e) => {
          pointersRef.current.delete(e.pointerId);
          if (dragRef.current?.id === e.pointerId) dragRef.current = null;
        }}
        ref={svgRef}
        tabIndex={0}
        role="img"
        aria-label={t('map.accessibleGlobe')}
        onKeyDown={(e) => {
          if (['+', '=', '-', 'Home', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
          if (e.key === '+' || e.key === '=') zoomBy(1.5);
          else if (e.key === '-') zoomBy(1 / 1.5);
          else if (e.key === 'Home') reset();
          else if (e.key.startsWith('Arrow')) {
            cancelAnimationFrame(flightRef.current);
            const step = 12 / zoom;
            setRotation(([x, y]) => [x + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0),
              Math.max(-90, Math.min(90, y + (e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0)))]);
          }
        }}
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
            <circle cx={cx} cy={cy} r={radius * zoom} />
          </clipPath>
        </defs>

        {/* atmÃ³sfera */}
        <circle cx={cx} cy={cy} r={radius * zoom + 16} fill="url(#g-halo)" />

        {shapes && (
          <>
            {/* ocÃ©ano base */}
            <path d={shapes.sphere} fill="url(#g-ocean)" />

            <g clipPath="url(#g-sphere)">
              {/* Projected geometry is clipped to the viewport. */}
              <g>
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
                  d={shapes.borders}
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
              <circle cx={cx} cy={cy} r={radius * zoom} fill="url(#g-shade)" pointerEvents="none" />
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

      {!data && <div role="status" className="absolute inset-0 grid place-items-center pointer-events-none">
        <div className="pointer-events-auto rounded-xl border border-white/15 bg-slate-950/90 p-4 text-sm text-white">
          {t(loadFailed ? 'map.loadError' : 'map.loading')}
          {loadFailed && <button type="button" onClick={() => { setLoadFailed(false); loadGlobe().then((value) => { setData(value); setLoadFailed(!value); }); }} className="ml-3 underline">{t('map.retry')}</button>}
        </div>
      </div>}
      {/* controles de zoom */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
        {[
          { icon: Plus, label: t("map.zoomIn"), fn: () => zoomBy(1.5) },
          { icon: Minus, label: t("map.zoomOut"), fn: () => zoomBy(1 / 1.5) },
          { icon: Maximize2, label: t("map.focusRegion"), fn: () => { const target = regionView(lat, lon, bbox, size.w, size.h); animateTo(target.rotation, target.zoom); } },
          { icon: RotateCcw, label: t("map.resetView"), fn: reset },
        ].map(({ icon: Icon, label, fn }) => (
          <button
            key={label}
            type="button"
            onClick={fn}
            aria-label={label}
            title={label}
            className="grid h-10 w-10 place-items-center rounded-lg border border-white/15 bg-black/45 text-white/80 backdrop-blur transition-colors hover:bg-white/15 hover:text-white"
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
