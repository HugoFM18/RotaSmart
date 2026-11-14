import { useState } from "react";
import { Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "../store";
import { FlatMap } from "./FlatMap";
import { Globe3D } from "./Globe3D";

export function GlobeView() {
  const { t } = useTranslation();
  const lat = useStore((s) => s.lat);
  const lon = useStore((s) => s.lon);
  const place = useStore((s) => s.place);
  const areaStatus = useStore((s) => s.areaStatus);
  const [mode, setMode] = useState<"globe" | "flat">("globe");

  return (
    <div className="relative h-full w-full bg-[#0B1220]">
      {mode === "globe" ? <Globe3D onRequestFlat={() => setMode("flat")} /> : <FlatMap />}

      <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[250px] rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-bone backdrop-blur">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
          <Globe2 size={12} /> {t("map.selected")}
        </p>
        {place && <p className="mt-1 max-w-[210px] truncate text-[11px] text-white/90" title={place}>{place}</p>}
        {areaStatus !== "idle" && <p role="status" className="mt-1 max-w-[210px] text-[10px] text-amber-200">
          {t(`map.area.${areaStatus}`)}
        </p>}
        <p className="num mt-1 text-[11px] text-white/90">
          {lat.toFixed(3)}°, {lon.toFixed(3)}°
        </p>
        <button
          type="button"
          onClick={() => setMode((m) => (m === "globe" ? "flat" : "globe"))}
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
