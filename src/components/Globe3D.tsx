import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoGraticule, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Point } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "../store";
import { pickLocation } from "../pick";
import { boundaryVisible, loadDepartments, loadMapData, loadMunicipalities } from "../map/boundaries";
import type { Boundaries } from "../map/boundaries";
import { clampZoom, createProjection, fitArea, globeRadius, inViewport, pointOnGlobe, sphericalGeometry } from "../map/geometry";
import type { View } from "../map/geometry";
import { indexFeatures, visibleFeatures, wrapLongitude } from "../globe";

type Layers = {
  admin1: FeatureCollection;
  rivers: FeatureCollection;
  lakes: FeatureCollection;
  cities: FeatureCollection<Point, { name: string; pop: number }>;
};
type Label = { name: string; x: number; y: number; department: boolean };
const LAND = "#C9D8BA";
const graticule = geoGraticule().step([10, 10])();

export function Globe3D({ onRequestFlat }: { onRequestFlat?: () => void }) {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const dragRef = useRef<{ id: number; x: number; y: number; rot: [number, number]; moved: number } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const flightRef = useRef(0);
  const pendingView = useRef<View | null>(null);
  const lat = useStore(s => s.lat);
  const lon = useStore(s => s.lon);
  const polygon = useStore(s => s.polygon);
  const bbox = useStore(s => s.bbox);
  const flyToken = useStore(s => s.flyToken);
  const [size, setSize] = useState({ w: 900, h: 700 });
  const [view, setView] = useState<View>(() => ({ rotation: [-lon, -lat], zoom: 1 }));
  const viewRef = useRef(view);
  const [countries, setCountries] = useState<FeatureCollection | null>(null);
  const [details, setDetails] = useState<Layers | null>(null);
  const [departments, setDepartments] = useState<Boundaries | null>(null);
  const [municipalities, setMunicipalities] = useState<Record<string, Boundaries>>({});
  const [baseError, setBaseError] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [retry, setRetry] = useState(0);
  const zoom = view.zoom;

  // One complete view per frame, always using the latest pointer position.
  const scheduleView = useCallback((next: View) => {
    pendingView.current = next;
    viewRef.current = next;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      if (pendingView.current) setView(pendingView.current);
      pendingView.current = null;
    });
  }, []);
  const animateTo = useCallback((target: View) => {
    cancelAnimationFrame(flightRef.current);
    const start = viewRef.current;
    const delta = wrapLongitude(target.rotation[0] - start.rotation[0]);
    const started = performance.now();
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650;
    const frame = (now: number) => {
      const progress = duration ? Math.min(1, (now - started) / duration) : 1;
      const ease = 1 - (1 - progress) ** 3;
      scheduleView({ rotation: [wrapLongitude(start.rotation[0] + delta * ease),
        start.rotation[1] + (target.rotation[1] - start.rotation[1]) * ease],
        zoom: Math.exp(Math.log(start.zoom) + Math.log(target.zoom / start.zoom) * ease) });
      if (progress < 1) flightRef.current = requestAnimationFrame(frame);
    };
    flightRef.current = requestAnimationFrame(frame);
  }, [scheduleView]);
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); cancelAnimationFrame(flightRef.current); }, []);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      cancelAnimationFrame(flightRef.current);
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.h : 1);
      scheduleView({ ...viewRef.current, zoom: clampZoom(viewRef.current.zoom * Math.exp(-Math.max(-100, Math.min(100, delta)) * 0.002)) });
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [scheduleView, size.h]);

  useEffect(() => {
    let active = true;
    setBaseError(false);
    // Only the small world topology is required for the first interactive frame.
    loadMapData<Topology<{ countries: GeometryCollection }>>("world-110m.json")
      .then(topo => { if (active) setCountries(feature(topo, topo.objects.countries)); })
      .catch(() => { if (active) setBaseError(true); });
    return () => { active = false; };
  }, [retry]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w && h) setSize(previous => previous.w === w && previous.h === h ? previous : { w, h });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (flyToken === 0) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    pendingView.current = null;
    const next: View = bbox ? fitArea(bbox, size) : {
      rotation: [-lon, -lat], zoom: Math.max(6, viewRef.current.zoom),
    };
    animateTo(next);
    // flyToken explicitly requests framing. Coordinate changes alone must not undo rotation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToken, size.w, size.h]);

  const projection = useMemo(() => createProjection(view, size), [view, size]);
  const path = useMemo(() => geoPath(projection).digits(2), [projection]);
  const cx = size.w / 2;
  const cy = size.h / 2;
  const radius = globeRadius(size) * zoom;

  const nearColombia = zoom >= 3 && inViewport([-74, 4], projection, size, radius * 0.25) !== null;
  useEffect(() => {
    if (!nearColombia || departments) return;
    let active = true;
    loadDepartments().then(data => { if (active) setDepartments(data); })
      .catch(() => { if (active) setDetailError(true); });
    return () => { active = false; };
  }, [nearColombia, departments, retry]);

  const showDetails = zoom >= 2.5;
  useEffect(() => {
    if (!showDetails || details) return;
    let active = true;
    loadMapData<Layers>("globe.json").then(data => { if (active) setDetails(data); })
      .catch(() => { if (active) setDetailError(true); });
    return () => { active = false; };
  }, [showDetails, details, retry]);

  const visibleDepartments = useMemo(() => departments?.features.filter(f => boundaryVisible(f, projection, size)) ?? [], [departments, projection, size]);
  const wantedFiles = zoom >= 12 ? visibleDepartments.map(f => f.properties.file).sort().join(",") : "";
  useEffect(() => {
    if (!wantedFiles || !departments) return;
    const wanted = new Set(wantedFiles.split(","));
    const missing = departments.features.filter(f => wanted.has(f.properties.file!) && !municipalities[f.properties.id]);
    if (!missing.length) return;
    let active = true;
    setLoadingDetail(true);
    setDetailError(false);
    Promise.allSettled(missing.map(async department => [department.properties.id, await loadMunicipalities(department)] as const))
      .then(results => {
        if (!active) return;
        const loaded: Record<string, Boundaries> = {};
        for (const result of results) {
          if (result.status === "fulfilled") loaded[result.value[0]] = result.value[1];
          else setDetailError(true);
        }
        setMunicipalities(previous => ({ ...previous, ...loaded }));
        setLoadingDetail(false);
      });
    return () => { active = false; setLoadingDetail(false); };
    // Changing cached collections alone must not retry a failed download in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedFiles, departments, retry]);

  const visibleMunicipalities = useMemo(() => zoom < 12 ? [] :
    visibleDepartments.flatMap(d => municipalities[d.properties.id]?.features ?? []).filter(f => boundaryVisible(f, projection, size)),
  [municipalities, visibleDepartments, projection, size, zoom]);
  const regionalSurface = departments && zoom >= 3;
  const worldIndex = useMemo(() => countries ? indexFeatures(countries) : [], [countries]);
  const detailIndex = useMemo(() => details ? {
    admin1: indexFeatures(details.admin1), rivers: indexFeatures(details.rivers), lakes: indexFeatures(details.lakes),
  } : null, [details]);
  const center: [number, number] = [-view.rotation[0], -view.rotation[1]];
  const visibleAngle = Math.asin(Math.min(1, Math.hypot(cx, cy) / radius)) + 0.02;
  const shapes = useMemo(() => ({
    countries: countries ? path({ type: "FeatureCollection", features: visibleFeatures(worldIndex, center, visibleAngle).features.filter((f: Feature) => !regionalSurface || String(f.id) !== "170") }) ?? "" : "",
    departments: regionalSurface ? path({ type: "FeatureCollection", features: visibleDepartments }) ?? "" : "",
    municipalities: visibleMunicipalities.length ? path({ type: "FeatureCollection", features: visibleMunicipalities }) ?? "" : "",
    admin1: showDetails && detailIndex ? path(visibleFeatures(detailIndex.admin1, center, visibleAngle)) ?? "" : "",
    rivers: showDetails && zoom < 12 && detailIndex ? path(visibleFeatures(detailIndex.rivers, center, visibleAngle)) ?? "" : "",
    lakes: showDetails && zoom < 12 && detailIndex ? path(visibleFeatures(detailIndex.lakes, center, visibleAngle)) ?? "" : "",
    graticule: zoom < 12 ? path(graticule) ?? "" : "",
  }), [countries, worldIndex, regionalSurface, visibleDepartments, visibleMunicipalities, path, detailIndex, showDetails, zoom]);
  const area = useMemo(() => sphericalGeometry(polygon), [polygon]);
  const areaPath = useMemo(() => area ? path(area) ?? "" : "", [area, path]);
  const marker = useMemo(() => inViewport([lon, lat], projection, size), [lon, lat, projection, size]);

  const labels = useMemo(() => {
    const candidates: Label[] = [];
    if (zoom >= 3) {
      for (const f of visibleDepartments) {
        const point = inViewport(f.properties.center, projection, size, 0);
        if (point) candidates.push({ name: f.properties.name, x: point[0], y: point[1], department: true });
      }
    }
    if (zoom >= 16) {
      for (const f of visibleMunicipalities) {
        const point = inViewport(f.properties.center, projection, size, 0);
        if (point) candidates.push({ name: f.properties.name, x: point[0], y: point[1], department: false });
      }
    }
    if (details) {
      for (const f of details.cities.features) {
        if (f.properties.pop < (zoom > 5 ? 150000 : 2500000)) continue;
        const point = inViewport(f.geometry.coordinates as [number, number], projection, size, 0);
        if (point) candidates.push({ name: f.properties.name, x: point[0], y: point[1], department: false });
      }
    }
    candidates.sort((a, b) => Number(b.department) - Number(a.department) ||
      Math.hypot(a.x - size.w / 2, a.y - size.h / 2) - Math.hypot(b.x - size.w / 2, b.y - size.h / 2));
    const placed: Label[] = [];
    for (const candidate of candidates) {
      if (candidate.x < 245 && candidate.y < 120 || candidate.x > size.w - 55 && candidate.y < 150 || candidate.y > size.h - 55) continue;
      if (placed.some(label => Math.abs(label.y - candidate.y) < 20 && Math.abs(label.x - candidate.x) < (label.name.length + candidate.name.length) * 3.2 + 12)) continue;
      placed.push(candidate);
      if (placed.length >= 55) break;
    }
    return placed;
  }, [details, projection, size, visibleDepartments, visibleMunicipalities, zoom]);

  const zoomBy = (factor: number) => animateTo({ ...viewRef.current, zoom: clampZoom(viewRef.current.zoom * factor) });
  const reset = () => animateTo({ rotation: [-lon, -lat], zoom: 1 });
  const focus = () => animateTo(bbox ? fitArea(bbox, size) : { rotation: [-lon, -lat], zoom: 12 });
  const retryData = () => { setDetailError(false); setRetry(value => value + 1); };

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_center,#18364d,#080f1c)]">
      <svg width={size.w} height={size.h} role="img" tabIndex={0} aria-label={t("map.accessibleGlobe")}
        className="block touch-none cursor-grab select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 active:cursor-grabbing"
        onKeyDown={e => {
          if (["+", "=", "-", "Home", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
          if (e.key === "+" || e.key === "=") zoomBy(1.5);
          else if (e.key === "-") zoomBy(1 / 1.5);
          else if (e.key === "Home") reset();
          else if (e.key.startsWith("Arrow")) {
            cancelAnimationFrame(flightRef.current);
            const current = viewRef.current;
            const step = 12 / current.zoom;
            scheduleView({ ...current, rotation: [wrapLongitude(current.rotation[0] + (e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0)),
              Math.max(-90, Math.min(90, current.rotation[1] + (e.key === "ArrowUp" ? step : e.key === "ArrowDown" ? -step : 0)))] });
          }
        }}
        onPointerDown={e => {
          if (e.button !== 0) return;
          cancelAnimationFrame(flightRef.current);
          e.currentTarget.setPointerCapture(e.pointerId);
          pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const points = [...pointersRef.current.values()];
          if (points.length > 1) {
            if (dragRef.current) dragRef.current.moved = 100;
            pinchRef.current = { distance: Math.max(1, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)), zoom: viewRef.current.zoom };
            return;
          }
          dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, rot: viewRef.current.rotation, moved: 0 };
        }}
        onPointerMove={e => {
          if (!pointersRef.current.has(e.pointerId)) return;
          pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const points = [...pointersRef.current.values()];
          if (points.length > 1 && pinchRef.current) {
            const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
            scheduleView({ ...viewRef.current, zoom: clampZoom(pinchRef.current.zoom * distance / pinchRef.current.distance) });
            return;
          }
          const drag = dragRef.current;
          if (!drag || drag.id !== e.pointerId) return;
          const dx = e.clientX - drag.x;
          const dy = e.clientY - drag.y;
          drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
          const k = 180 / (Math.PI * globeRadius(size) * viewRef.current.zoom);
          scheduleView({ zoom: viewRef.current.zoom, rotation: [wrapLongitude(drag.rot[0] + dx * k), Math.max(-90, Math.min(90, drag.rot[1] - dy * k))] });
        }}
        onPointerUp={e => {
          const drag = dragRef.current;
          dragRef.current = null;
          pointersRef.current.delete(e.pointerId);
          pinchRef.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
          if (!drag || drag.id !== e.pointerId || drag.moved > 6) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const point = pointOnGlobe(e.clientX - rect.left, e.clientY - rect.top, projection);
          if (point) pickLocation(point[1], point[0], zoom >= 12 ? 10 : 6);
        }}
        onPointerCancel={e => { pointersRef.current.delete(e.pointerId); pinchRef.current = null; dragRef.current = null; }}
        onLostPointerCapture={e => { pointersRef.current.delete(e.pointerId); pinchRef.current = null; if (dragRef.current?.id === e.pointerId) dragRef.current = null; }}>
        <defs>
          <radialGradient id="g-ocean" cx="34%" cy="28%" r="78%">
            <stop offset="0%" stopColor="#1D3E5E" /><stop offset="65%" stopColor="#12293F" /><stop offset="100%" stopColor="#0A1826" />
          </radialGradient>
          <radialGradient id="g-halo">
            <stop offset="90%" stopColor="rgba(90,150,200,0.2)" /><stop offset="100%" stopColor="rgba(90,150,200,0)" />
          </radialGradient>
          <radialGradient id="g-shade" cx="38%" cy="34%" r="72%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.10)" /><stop offset="55%" stopColor="rgba(255,255,255,0)" />
            <stop offset="86%" stopColor="rgba(6,14,24,0.22)" /><stop offset="100%" stopColor="rgba(6,14,24,0.42)" />
          </radialGradient>
          <clipPath id="g-sphere"><circle cx={cx} cy={cy} r={radius} /></clipPath>
        </defs>
        {/* Draw the sphere immediately; country and local detail loads independently. */}
        <circle cx={cx} cy={cy} r={radius + 16} fill="url(#g-halo)" />
        <circle cx={cx} cy={cy} r={radius} fill="url(#g-ocean)" />
        <g clipPath="url(#g-sphere)">
          <path d={shapes.graticule} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={0.5} />
          <path data-layer="countries" d={shapes.countries} fill={LAND} stroke="#796E52" strokeWidth={0.9} strokeLinejoin="round" />
          <path data-layer="departments" d={shapes.departments} fill={LAND} stroke="#75654A" strokeWidth={1.3} strokeLinejoin="round" />
          <path d={shapes.lakes} fill="#4A93C6" />
          <path d={shapes.rivers} fill="none" stroke="rgba(38,104,146,0.75)" strokeWidth={0.9} />
          <path d={shapes.admin1} fill="none" stroke="rgba(112,96,64,0.5)" strokeWidth={0.75} />
          <path data-layer="municipalities" d={shapes.municipalities} fill="none" stroke="rgba(112,96,64,0.65)" strokeWidth={0.65} strokeLinejoin="round" />
          <path data-layer="selected-area" d={areaPath} fill="rgba(255,201,64,0.25)" fillRule="evenodd" stroke="#C9860A" strokeWidth={2.5} strokeLinejoin="round" />
          <circle cx={cx} cy={cy} r={radius} fill="url(#g-shade)" pointerEvents="none" />
        </g>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(150,195,230,0.3)" />
        <g pointerEvents="none" style={{ fontFamily: "var(--font-sans)" }}>
          {labels.map((label, index) => (
            <text key={`${label.name}-${index}`} x={label.x} y={label.y} textAnchor="middle"
              fontSize={label.department ? 11 : 10} fontWeight={label.department ? 650 : 450}
              fill={label.department ? "#5C4C30" : "#2A2418"} stroke="rgba(255,252,242,0.95)" strokeWidth={3} paintOrder="stroke">
              {label.name}
            </text>
          ))}
        </g>
        {marker && <g pointerEvents="none">
          <circle cx={marker[0]} cy={marker[1]} r={11} fill="rgba(217,149,0,0.22)" />
          <circle cx={marker[0]} cy={marker[1]} r={5} fill="#D99500" stroke="#FFFDF6" strokeWidth={1.8} />
        </g>}
      </svg>

      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
        {[
          { icon: Plus, label: t("map.zoomIn"), fn: () => zoomBy(1.5) },
          { icon: Minus, label: t("map.zoomOut"), fn: () => zoomBy(1 / 1.5) },
          { icon: Maximize2, label: t("map.focusArea"), fn: focus },
          { icon: RotateCcw, label: t("map.resetView"), fn: reset },
        ].map(({ icon: Icon, label, fn }) => (
          <button key={label} type="button" onClick={fn} aria-label={label} title={label}
            className="grid h-10 w-10 place-items-center rounded-lg border border-white/15 bg-black/45 text-white/80 backdrop-blur transition-colors hover:bg-white/15 hover:text-white">
            <Icon size={14} strokeWidth={1.9} />
          </button>
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-4 right-3 z-10 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-white/55 backdrop-blur">
        {t("map.zoom")} ×{zoom.toFixed(zoom < 10 ? 1 : 0)}
      </div>
      {(!countries || loadingDetail || detailError) && (
        <div role="status" className="absolute bottom-14 left-3 z-10 max-w-[250px] rounded-lg border border-white/15 bg-black/65 px-3 py-2 text-[11px] text-white/80 backdrop-blur">
          {baseError ? t("map.loadError") : detailError ? t("map.detailError") : loadingDetail ? t("map.loadingDetail") : t("map.loadingGlobe")}
          {(baseError || detailError) && <button type="button" className="ml-2 underline" onClick={retryData}>{t("map.retry")}</button>}
          {baseError && onRequestFlat && <button type="button" className="ml-2 underline" onClick={onRequestFlat}>{t("map.flat")}</button>}
        </div>
      )}
      <div className="pointer-events-none absolute bottom-1 left-3 text-[8px] text-white/50">
        Natural Earth · {departments ? "geoBoundaries (CC BY 4.0)" : ""}
      </div>
    </div>
  );
}
