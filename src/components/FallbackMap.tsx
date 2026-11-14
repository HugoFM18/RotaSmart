import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "../store";

const WORLD_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Equirectangular_projection_SW.jpg/1280px-Equirectangular_projection_SW.jpg";

/** Mapa mundial 2D sin WebGL: siempre funciona, incluso sin aceleración por hardware. */
export function FallbackMap() {
  const { t } = useTranslation();
  const lat = useStore((s) => s.lat);
  const lon = useStore((s) => s.lon);
  const setPoint = useStore((s) => s.setPoint);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPoint(90 - y * 180, x * 360 - 180);
  };

  return (
    <div
      ref={wrapRef}
      onClick={handleClick}
      className="absolute inset-0 cursor-crosshair overflow-hidden"
      role="button"
      aria-label={t("map.hint")}
      tabIndex={0}
    >
      <img
        src={WORLD_IMAGE}
        alt=""
        draggable={false}
        className="pointer-events-none h-full w-full select-none object-fill"
        style={{ filter: "saturate(1.05) brightness(0.95)" }}
      />
      <span
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${((lon + 180) / 360) * 100}%`, top: `${((90 - lat) / 180) * 100}%` }}
      >
        <span className="rs-marker">
          <span className="rs-marker-ring" />
          <span className="rs-marker-dot" />
        </span>
      </span>
    </div>
  );
}
