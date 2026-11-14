import { useEffect, useMemo, useRef, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule, geoDistance } from "d3-geo";
import { feature } from "topojson-client";
import { useStore } from "../store";
import { pickLocation } from "../pick";

let worldPromise: Promise<any> | null = null;

function loadWorld(): Promise<any> {
  if (!worldPromise) {
    const base = import.meta.env.BASE_URL;
    worldPromise = fetch(`${base}data/world-110m.json`)
      .then((r) => r.json())
      .then((topo) => feature(topo, topo.objects.countries) as any)
      .catch(() => null);
  }
  return worldPromise;
}

const OCEAN = "#0E1B2E";
const LAND = "#1E5A44";
const LAND_STROKE = "#0A2A20";
const GRAT = "rgba(255,255,255,0.07)";

export function Globe3D() {
  const lat = useStore((s) => s.lat);
  const lon = useStore((s) => s.lon);
  const polygon = useStore((s) => s.polygon);
  const bbox = useStore((s) => s.bbox);
  const flyToken = useStore((s) => s.flyToken);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [world, setWorld] = useState<any>(null);
  const [rotation, setRotation] = useState<[number, number]>([75.28, -2.93]);
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ x: number; y: number; rot: [number, number]; moved: number } | null>(null);

  useEffect(() => {
    loadWorld().then(setWorld);
  }, []);

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  /* centrar y ampliar en la zona seleccionada */
  useEffect(() => {
    if (flyToken === 0) return;
    const centerLon = bbox ? (bbox[1] + bbox[3]) / 2 : lon;
    const centerLat = bbox ? (bbox[0] + bbox[2]) / 2 : lat;
    const span = bbox ? Math.max(bbox[3] - bbox[1], bbox[2] - bbox[0]) : 6;
    const target = Math.max(1.2, Math.min(48, 63 / Math.max(span, 0.02)));
    setRotation([-centerLon, -centerLat]);
    setZoom(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToken]);

  const radius = Math.min(size.w, size.h) / 2 - 18;

  const projection = useMemo(
    () =>
      geoOrthographic()
        .translate([size.w / 2, size.h / 2])
        .scale(Math.max(40, radius) * zoom)
        .rotate([rotation[0], rotation[1], 0])
        .clipAngle(90),
    [size.w, size.h, radius, zoom, rotation],
  );

  const path = useMemo(() => geoPath(projection), [projection]);

  const countriesPath = useMemo(() => (world ? path(world) ?? "" : ""), [world, path]);
  const graticulePath = useMemo(() => {
    const step = zoom > 30 ? 0.25 : zoom > 10 ? 1 : 10;
    return path(geoGraticule().step([step, step])()) ?? "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, zoom]);
  const spherePath = useMemo(() => path({ type: "Sphere" } as any) ?? "", [path]);

  const polyFeature = useMemo(
    () => (polygon ? ({ type: "Feature", properties: {}, geometry: polygon } as any) : null),
    [polygon],
  );
  const polyPath = useMemo(
    () => (polyFeature ? path(polyFeature) ?? "" : ""),
    [polyFeature, path],
  );

  const center: [number, number] = [-rotation[0], -rotation[1]];
  const visible = geoDistance([lon, lat], center) < Math.PI / 2;
  const projected = projection([lon, lat]);
  const markerVisible = visible && projected != null;

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, rot: rotation, moved: 0 };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.moved = Math.max(d.moved, Math.abs(dx) + Math.abs(dy));
    const k = 0.25 / zoom;
    const lambda = d.rot[0] + dx * k;
    const phi = Math.max(-85, Math.min(85, d.rot[1] - dy * k));
    setRotation([lambda, phi]);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.moved > 5) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const inv = projection.invert?.([x, y]);
    if (inv) pickLocation(inv[1], inv[0], 6);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    setZoom((z) => Math.max(1, Math.min(48, z * (e.deltaY > 0 ? 0.86 : 1.16))));
  };

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <svg
        width={size.w}
        height={size.h}
        className="block cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <defs>
          <radialGradient id="ocean" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#16324C" />
            <stop offset="70%" stopColor={OCEAN} />
            <stop offset="100%" stopColor="#081220" />
          </radialGradient>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="85%" stopColor="rgba(70,130,180,0.18)" />
            <stop offset="100%" stopColor="rgba(70,130,180,0)" />
          </radialGradient>
        </defs>

        <circle cx={size.w / 2} cy={size.h / 2} r={radius * zoom + 14} fill="url(#halo)" />

        <path d={spherePath} fill="url(#ocean)" />
        <path d={spherePath} fill="none" stroke="rgba(120,170,210,0.25)" strokeWidth={1} />

        {countriesPath && (
          <path d={countriesPath} fill={LAND} stroke={LAND_STROKE} strokeWidth={0.4} />
        )}

        <path d={graticulePath} fill="none" stroke={GRAT} strokeWidth={0.5} />

        {polyPath && (
          <path
            d={polyPath}
            fill="rgba(255,213,79,0.22)"
            stroke="#F0B429"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        )}

        {markerVisible && projected && (
          <g>
            <circle cx={projected[0]} cy={projected[1]} r={9} fill="rgba(199,125,19,0.25)" />
            <circle
              cx={projected[0]}
              cy={projected[1]}
              r={4}
              fill="#C77D13"
              stroke="#fff"
              strokeWidth={1.5}
            />
          </g>
        )}
      </svg>
    </div>
  );
}
