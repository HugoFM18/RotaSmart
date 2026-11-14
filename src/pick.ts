import { fetchArea } from "./site";
import { useStore } from "./store";
import i18n from "./i18n";

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
  useStore.getState().setAreaStatus("loading");

  const run = async () => {
    const wait = Math.max(0, 1100 - (Date.now() - lastCall));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (myToken !== token) return;
    lastCall = Date.now();

    const area = await fetchArea(lat, lon, i18n.resolvedLanguage ?? "es", zoom);
    const current = useStore.getState();
    if (myToken !== token || current.lat !== lat || current.lon !== lon) return;

    if (area && (area.polygon || area.bbox)) {
      setArea(area.polygon, area.bbox, area.name);
    } else {
      useStore.getState().setAreaStatus("unavailable");
    }
  };

  void run();
}
