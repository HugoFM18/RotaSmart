import { fetchArea } from "./site";
import { useStore } from "./store";
import i18n from "./i18n";
import { localArea } from "./map/boundaries";

let lastCall = 0;
let token = 0;

/**
 * Clic en el mapa: marca el punto de inmediato y, en segundo plano,
 * obtiene el límite administrativo de la zona para dibujarlo y hacer zoom.
 */
export function pickLocation(lat: number, lon: number, zoom = 10) {
  const myToken = ++token;
  const { setPoint, setArea } = useStore.getState();

  setPoint(lat, lon);
  const selectionToken = useStore.getState().flyToken;

  const run = async () => {
    const isCurrent = () => {
      const state = useStore.getState();
      return myToken === token && state.flyToken === selectionToken && state.lat === lat && state.lon === lon;
    };
    try {
      const area = await localArea(lat, lon, zoom);
      if (!isCurrent()) return;
      if (area) {
        setArea(area.polygon, area.bbox, area.name);
        return;
      }
    } catch { /* Network fallback if local assets are temporarily unavailable. */ }
    const wait = Math.max(0, 1100 - (Date.now() - lastCall));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (!isCurrent()) return;
    lastCall = Date.now();

    const area = await fetchArea(lat, lon, i18n.resolvedLanguage ?? "es", zoom);
    if (!isCurrent()) return;

    if (area && (area.polygon || area.bbox)) {
      setArea(area.polygon, area.bbox, area.name);
    } else {
      useStore.getState().setAreaStatus("unavailable");
    }
  };

  void run();
}
