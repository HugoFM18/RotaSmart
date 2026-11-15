import type { ClimateSite } from "./engine";

export type SiteData = ClimateSite & {
  lat: number;
  lon: number;
  soilSource: "soilgrids" | "estimated";
};

const START = 2005;
const END = 2024;
const RAD = Math.PI / 180;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const daysInMonth = (m: number, y: number) => new Date(y, m, 0).getDate();

function extraterrestrialRadiation(latDeg: number, doy: number) {
  const phi = latDeg * RAD;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * doy) / 365);
  const dec = 0.409 * Math.sin((2 * Math.PI * doy) / 365 - 1.39);
  const ws = Math.acos(clamp(-Math.tan(phi) * Math.tan(dec), -1, 1));
  return (
    ((24 * 60) / Math.PI) *
    0.082 *
    dr *
    (ws * Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.sin(ws))
  );
}

const midMonthDoy = (m: number) => 15 + [0, 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][m];

function hargreavesEt0(lat: number, tmean: number, tmax: number, tmin: number, month: number) {
  const ra = extraterrestrialRadiation(lat, midMonthDoy(month)) * 0.408;
  const amplitude = Math.max(0.1, tmax - tmin);
  return Math.max(0, 0.0023 * (tmean + 17.8) * Math.sqrt(amplitude) * ra);
}

type Param = Record<string, Record<string, number>>;

function monthlyClimatology(param: Param, name: string) {
  const out = Array(12).fill(0);
  const counts = Array(12).fill(0);
  for (const [key, value] of Object.entries(param[name] ?? {})) {
    const month = Number(key.slice(4, 6));
    if (month < 1 || month > 12) return out;
    if (value === -999 || value == null) continue;
    out[month - 1] += value;
    counts[month - 1] += 1;
  }
  return out.map((v, i) => (counts[i] ? v / counts[i] : 0));
}

function trendPerDecade(series: { year: number; value: number }[]) {
  if (series.length < 3) return 0;
  const n = series.length;
  const mx = series.reduce((a, s) => a + s.year, 0) / n;
  const my = series.reduce((a, s) => a + s.value, 0) / n;
  const num = series.reduce((a, s) => a + (s.year - mx) * (s.value - my), 0);
  const den = series.reduce((a, s) => a + (s.year - mx) ** 2, 0);
  return den ? (num / den) * 10 : 0;
}

function annualTempSeries(param: Param) {
  const out: { year: number; value: number }[] = [];
  for (let y = START; y <= END; y++) {
    const v = param.T2M?.[`${y}13`];
    if (v != null && v !== -999) out.push({ year: y, value: v });
  }
  return out;
}

function annualPrecipSeries(param: Param) {
  const out: { year: number; value: number }[] = [];
  for (let y = START; y <= END; y++) {
    let sum = 0;
    let ok = true;
    for (let m = 1; m <= 12; m++) {
      const v = param.PRECTOTCORR?.[`${y}${String(m).padStart(2, "0")}`];
      if (v == null || v === -999) {
        ok = false;
        break;
      }
      sum += v * daysInMonth(m, y);
    }
    if (ok) out.push({ year: y, value: sum });
  }
  return out;
}

export function estimateSoil(map: number, mat: number) {
  return {
    clay: round(clamp(12 + map / 95, 10, 42)),
    sand: round(clamp(68 - map / 70, 22, 72)),
    om: round(clamp(0.5 + map / 750 - (mat - 18) * 0.08, 0.5, 5.5), 2),
    ph: round(clamp(6.9 - map / 1300, 4.8, 6.9), 1),
    cec: round(clamp(3 + (12 + map / 95) * 0.55, 4, 32)),
  };
}

async function fetchPower(lat: number, lon: number): Promise<Param> {
  const params = "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN";
  const url =
    `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${params}` +
    `&community=AG&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}` +
    `&start=${START}&end=${END}&format=JSON`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`POWER ${res.status}`);
  const json = await res.json();
  const p = json?.properties?.parameter;
  if (!p) throw new Error("POWER sin datos");
  return p;
}

async function fetchSoilGrids(lat: number, lon: number) {
  try {
    const query =
      `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon.toFixed(4)}` +
      `&lat=${lat.toFixed(4)}&property=clay&property=sand&property=soc&property=phh2o&property=cec` +
      `&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean`;
    const res = await fetch(query);
    if (!res.ok) return null;
    const json = await res.json();
    const layers: any[] = json?.properties?.layers ?? [];
    const weights = [5, 10, 15];

    const pick = (name: string): number | null => {
      const layer = layers.find((l) => l.name === name);
      if (!layer) return null;
      let sum = 0;
      let wsum = 0;
      layer.depths?.forEach((d: any, i: number) => {
        const raw = d?.values?.mean;
        const factor = layer.unit_measure?.d_factor ?? 10;
        if (raw != null && Number.isFinite(raw)) {
          sum += (raw / factor) * weights[i];
          wsum += weights[i];
        }
      });
      return wsum ? sum / wsum : null;
    };

    const clay = pick("clay");
    const sand = pick("sand");
    const soc = pick("soc");
    const ph = pick("phh2o");
    const cec = pick("cec");
    if (clay == null || sand == null || ph == null) return null;

    const om = soc != null ? clamp((soc / 10) * 1.724, 0.3, 12) : 2;

    return {
      clay: round(clay),
      sand: round(sand),
      om: round(om, 2),
      ph: round(ph, 1),
      cec: round(cec ?? 12, 1),
    };
  } catch {
    return null;
  }
}

export async function fetchSite(lat: number, lon: number): Promise<SiteData> {
  const p = await fetchPower(lat, lon);

  const t2m = monthlyClimatology(p, "T2M");
  const tmax = monthlyClimatology(p, "T2M_MAX");
  const tmin = monthlyClimatology(p, "T2M_MIN");
  const ppt = monthlyClimatology(p, "PRECTOTCORR").map((v, i) => v * daysInMonth(i + 1, 2001));
  const rh = monthlyClimatology(p, "RH2M");
  const wind = monthlyClimatology(p, "WS2M");
  const solar = monthlyClimatology(p, "ALLSKY_SFC_SW_DWN");

  const et0 = Array.from({ length: 12 }, (_, i) =>
    hargreavesEt0(lat, t2m[i], tmax[i], tmin[i], i + 1) * daysInMonth(i + 1, 2001),
  );

  const annualPpt = ppt.reduce((a, b) => a + b, 0);
  const annualEt0 = Math.max(1, et0.reduce((a, b) => a + b, 0));
  const mat = t2m.reduce((a, b) => a + b, 0) / 12;
  const aridity = annualPpt / annualEt0;

  const soilgrids = await fetchSoilGrids(lat, lon);
  const soil = soilgrids ?? estimateSoil(annualPpt, mat);

  return {
    lat,
    lon,
    soilSource: soilgrids ? "soilgrids" : "estimated",
    climate: {
      t2m: t2m.map((v) => round(v)),
      tmax: tmax.map((v) => round(v)),
      tmin: tmin.map((v) => round(v)),
      ppt: ppt.map((v) => round(v)),
      et0: et0.map((v) => round(v)),
      rh: rh.map((v) => round(v)),
      wind: wind.map((v) => round(v)),
      solar: solar.map((v) => round(v)),
    },
    annual: {
      ppt: round(annualPpt),
      et0: round(annualEt0),
      tmean: round(mat),
      aridity: round(aridity, 2),
    },
    trends: {
      t2m: round(trendPerDecade(annualTempSeries(p)), 2),
      ppt: round(trendPerDecade(annualPrecipSeries(p)), 1),
    },
    hazards: {
      frost: round(tmin.filter((t) => t < 3).length / 12, 2),
      heat: round(tmax.filter((t) => t > 32).length / 12, 2),
      drought: round(clamp(1 - aridity / 1.2, 0, 1), 2),
      erosivity: round(Math.min(1, annualPpt / 2600), 2),
    },
    soil,
  };
}

export async function fetchPlace(lat: number, lon: number, lang: string) {
  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}` +
      `&longitude=${lon}&localityLanguage=${lang}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json();
    const parts = [j.city || j.locality, j.principalSubdivision, j.countryName].filter(
      (x) => x && String(x).trim().length > 0,
    );
    return parts.length ? parts.join(", ") : null;
  } catch {
    return null;
  }
}

/** Límite administrativo que contiene el punto. zoom: 6 = departamento, 10 = municipio. */
export async function fetchArea(lat: number, lon: number, lang: string, zoom = 10) {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=${zoom}` +
      `&polygon_geojson=1&polygon_threshold=0.0005&addressdetails=1&lat=${lat}&lon=${lon}` +
      `&accept-language=${lang}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const j = await res.json();

    const g = j?.geojson;
    const polygon =
      g && (g.type === "Polygon" || g.type === "MultiPolygon") ? g : null;

    const bb = j?.boundingbox as [string, string, string, string] | undefined;
    const bbox: [number, number, number, number] | null = bb
      ? [Number(bb[0]), Number(bb[2]), Number(bb[1]), Number(bb[3])]
      : null;

    const name =
      typeof j?.display_name === "string"
        ? j.display_name.split(",").slice(0, 3).join(",").trim()
        : null;

    return { polygon, bbox, name };
  } catch {
    return null;
  }
}
