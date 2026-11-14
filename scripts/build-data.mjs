/**
 * RotaSmart — generador de datos
 * Fuente principal: NASA POWER (https://power.larc.nasa.gov/)
 * Salida: public/data/m/{id}.json + public/data/index.json
 *
 * Uso:  node scripts/build-data.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const GEO = path.join(ROOT, "public", "data", "geo", "huila.json");
const OUT = path.join(ROOT, "public", "data", "m");
const INDEX = path.join(ROOT, "public", "data", "index.json");

const START = 2005;
const END = 2024;
const RAD = Math.PI / 180;

fs.mkdirSync(OUT, { recursive: true });

const geo = JSON.parse(fs.readFileSync(GEO, "utf8"));

const slug = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function bboxCenter(g) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const walk = (c) => {
    if (typeof c[0] === "number") {
      x0 = Math.min(x0, c[0]); y0 = Math.min(y0, c[1]);
      x1 = Math.max(x1, c[0]); y1 = Math.max(y1, c[1]);
    } else c.forEach(walk);
  };
  walk(g.coordinates);
  return [(x0 + x1) / 2, (y0 + y1) / 2];
}

const round = (v, d = 1) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

/* ---------- ET0 (Hargreaves, FAO-56) ---------- */
function extraterrestrialRadiation(latDeg, doy) {
  const phi = latDeg * RAD;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * doy) / 365);
  const dec = 0.409 * Math.sin((2 * Math.PI * doy) / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(dec))));
  return (24 * 60 / Math.PI) * 0.082 * dr *
    (ws * Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.sin(ws));
}

const daysInMonth = (m, y) => new Date(y, m, 0).getDate();
const midMonthDoy = (m) => 15 + [0, 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][m];

function hargreavesEt0(lat, tmean, tmax, tmin, month) {
  const ra = extraterrestrialRadiation(lat, midMonthDoy(month)) * 0.408;
  const amplitude = Math.max(0.1, tmax - tmin);
  const daily = 0.0023 * (tmean + 17.8) * Math.sqrt(amplitude) * ra;
  return Math.max(0, daily);
}

/* ---------- modelado de suelo ---------- */
function estimateSoil(map, mat) {
  const clay = Math.max(10, Math.min(42, 12 + map / 95));
  const sand = Math.max(22, Math.min(72, 68 - map / 70));
  const om = Math.max(0.5, Math.min(5.5, 0.5 + map / 750 - (mat - 18) * 0.08));
  const ph = Math.max(4.8, Math.min(6.9, 6.9 - map / 1300));
  const cec = Math.max(4, Math.min(32, 3 + clay * 0.55));
  return {
    clay: round(clay), sand: round(sand), om: round(om, 2),
    ph: round(ph, 1), cec: round(cec),
  };
}

/* ---------- NASA POWER ---------- */
async function fetchPower(lon, lat, tries = 3) {
  const params = "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN";
  const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${params}` +
    `&community=AG&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}` +
    `&start=${START}&end=${END}&format=JSON`;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (!j?.properties?.parameter) throw new Error("sin parameter");
      return j.properties.parameter;
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((res) => setTimeout(res, 700 * (i + 1)));
    }
  }
}

function monthlyClimatology(param, name) {
  const out = Array(12).fill(0);
  const counts = Array(12).fill(0);
  for (const [key, value] of Object.entries(param[name] ?? {})) {
    const month = Number(key.slice(4, 6));
    if (month < 1 || month > 12) continue;
    if (value === -999 || value == null) continue;
    out[month - 1] += value;
    counts[month - 1] += 1;
  }
  return out.map((v, i) => (counts[i] ? v / counts[i] : 0));
}

function annualPrecipSeries(param) {
  const out = [];
  for (let y = START; y <= END; y++) {
    let sum = 0;
    let ok = true;
    for (let m = 1; m <= 12; m++) {
      const key = `${y}${String(m).padStart(2, "0")}`;
      const v = param.PRECTOTCORR?.[key];
      if (v == null || v === -999) { ok = false; break; }
      sum += v * daysInMonth(m, y);
    }
    if (ok) out.push({ year: y, value: sum });
  }
  return out;
}

function annualSeries(param, name) {
  const out = [];
  for (let y = START; y <= END; y++) {
    const v = param[name]?.[`${y}13`];
    if (v != null && v !== -999) out.push({ year: y, value: v });
  }
  return out;
}

function trendPerDecade(series) {
  if (series.length < 3) return 0;
  const n = series.length;
  const mx = series.reduce((a, s) => a + s.year, 0) / n;
  const my = series.reduce((a, s) => a + s.value, 0) / n;
  const num = series.reduce((a, s) => a + (s.year - mx) * (s.value - my), 0);
  const den = series.reduce((a, s) => a + (s.year - mx) ** 2, 0);
  return den ? (num / den) * 10 : 0;
}

/* ---------- construcción ---------- */
async function buildOne(feature, idx, total) {
  const name = feature.properties.shapeName;
  const [lon, lat] = bboxCenter(feature.geometry);
  const id = slug(name);
  process.stdout.write(`[${idx + 1}/${total}] ${name} ... `);

  const p = await fetchPower(lon, lat);

  const t2m = monthlyClimatology(p, "T2M");
  const tmax = monthlyClimatology(p, "T2M_MAX");
  const tmin = monthlyClimatology(p, "T2M_MIN");
  const ppt = monthlyClimatology(p, "PRECTOTCORR")
    .map((v, i) => v * daysInMonth(i + 1, 2001));
  const rh = monthlyClimatology(p, "RH2M");
  const wind = monthlyClimatology(p, "WS2M");
  const solar = monthlyClimatology(p, "ALLSKY_SFC_SW_DWN");

  const et0 = Array.from({ length: 12 }, (_, i) => {
    const daily = hargreavesEt0(lat, t2m[i], tmax[i], tmin[i], i + 1);
    return daily * daysInMonth(i + 1, 2001);
  });

  const annualPpt = ppt.reduce((a, b) => a + b, 0);
  const annualEt0 = et0.reduce((a, b) => a + b, 0);
  const mat = t2m.reduce((a, b) => a + b, 0) / 12;

  const frostMonths = tmin.filter((t) => t < 3).length;
  const heatMonths = tmax.filter((t) => t > 32).length;
  const aridity = annualEt0 > 0 ? annualPpt / annualEt0 : 0;

  const soil = estimateSoil(annualPpt, mat);

  const record = {
    id,
    name,
    lat: round(lat, 4),
    lon: round(lon, 4),
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
      t2m: round(trendPerDecade(annualSeries(p, "T2M")), 2),
      ppt: round(trendPerDecade(annualPrecipSeries(p)), 1),
    },
    hazards: {
      frost: round(frostMonths / 12, 2),
      heat: round(heatMonths / 12, 2),
      drought: round(Math.max(0, Math.min(1, 1 - aridity / 1.2)), 2),
      erosivity: round(Math.min(1, annualPpt / 2600), 2),
    },
    soil,
    source: "NASA POWER 2005-2024 · suelos estimados a partir de clima",
  };

  fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify(record));
  console.log(`ok (${annualPpt.toFixed(0)} mm, ${mat.toFixed(1)} °C)`);
  return record;
}

async function main() {
  const features = geo.features;
  const results = [];
  for (let i = 0; i < features.length; i++) {
    try {
      results.push(await buildOne(features[i], i, features.length));
    } catch (e) {
      console.error(`FALLÓ ${features[i].properties.shapeName}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  const index = results.map((r) => ({
    id: r.id,
    name: r.name,
    lat: r.lat,
    lon: r.lon,
    aridity: r.annual.aridity,
    trend: r.trends.t2m,
    ppt: r.annual.ppt,
  }));
  fs.writeFileSync(INDEX, JSON.stringify(index));
  console.log(`\nListo: ${results.length} municipios.`);
}

main();
