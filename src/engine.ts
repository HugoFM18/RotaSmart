export type CropId =
  | "maiz"
  | "frijol"
  | "yuca"
  | "sorgo"
  | "cafe"
  | "platano"
  | "cobertura"
  | "arroz"
  | "cacao"
  | "pastura";

export type Family = "cereal" | "legume" | "root" | "cover" | "perennial";

export type Crop = {
  kc: number;
  nFix: number;
  cover: number;
  residue: number;
  root: number;
  pest: number;
  income: number;
  drought: number;
  heat: number;
  labor: number;
  family: Family;
  tOptMin: number;
  tOptMax: number;
  tMaxCrit: number;
  tMinCrit: number;
  phMin: number;
  phMax: number;
  clayMin: number;
  clayMax: number;
};

export const CROPS: Record<CropId, Crop> = {
  maiz: { kc: 0.95, nFix: 0, cover: 0.55, residue: 0.7, root: 0.6, pest: 0.45, income: 0.65, drought: 0.4, heat: 0.55, labor: 0.55, family: "cereal", tOptMin: 18, tOptMax: 30, tMaxCrit: 35, tMinCrit: 2, phMin: 5.8, phMax: 7.0, clayMin: 15, clayMax: 40 },
  frijol: { kc: 0.7, nFix: 0.85, cover: 0.75, residue: 0.5, root: 0.5, pest: 0.85, income: 0.65, drought: 0.45, heat: 0.4, labor: 0.55, family: "legume", tOptMin: 15, tOptMax: 27, tMaxCrit: 32, tMinCrit: 1, phMin: 5.8, phMax: 7.0, clayMin: 20, clayMax: 40 },
  yuca: { kc: 0.75, nFix: 0, cover: 0.85, residue: 0.4, root: 0.85, pest: 0.7, income: 0.5, drought: 0.9, heat: 0.85, labor: 0.4, family: "root", tOptMin: 20, tOptMax: 30, tMaxCrit: 38, tMinCrit: 5, phMin: 4.5, phMax: 6.5, clayMin: 15, clayMax: 35 },
  sorgo: { kc: 0.6, nFix: 0, cover: 0.6, residue: 0.85, root: 0.7, pest: 0.55, income: 0.45, drought: 0.95, heat: 0.95, labor: 0.3, family: "cereal", tOptMin: 22, tOptMax: 35, tMaxCrit: 40, tMinCrit: 3, phMin: 5.5, phMax: 7.5, clayMin: 15, clayMax: 45 },
  cafe: { kc: 0.85, nFix: 0, cover: 0.9, residue: 0.6, root: 0.8, pest: 0.7, income: 0.95, drought: 0.5, heat: 0.3, labor: 0.75, family: "perennial", tOptMin: 16, tOptMax: 25, tMaxCrit: 30, tMinCrit: 2, phMin: 5.0, phMax: 6.5, clayMin: 20, clayMax: 45 },
  platano: { kc: 1.0, nFix: 0, cover: 0.95, residue: 0.55, root: 0.6, pest: 0.6, income: 0.7, drought: 0.4, heat: 0.5, labor: 0.65, family: "perennial", tOptMin: 20, tOptMax: 30, tMaxCrit: 34, tMinCrit: 6, phMin: 5.0, phMax: 7.0, clayMin: 20, clayMax: 45 },
  cobertura: { kc: 0.5, nFix: 0.9, cover: 1.0, residue: 1.0, root: 0.8, pest: 0.85, income: 0.1, drought: 0.65, heat: 0.65, labor: 0.2, family: "cover", tOptMin: 12, tOptMax: 28, tMaxCrit: 34, tMinCrit: -2, phMin: 5.0, phMax: 7.0, clayMin: 15, clayMax: 45 },
  arroz: { kc: 1.2, nFix: 0, cover: 0.8, residue: 0.4, root: 0.5, pest: 0.4, income: 0.6, drought: 0.2, heat: 0.7, labor: 0.7, family: "cereal", tOptMin: 20, tOptMax: 32, tMaxCrit: 38, tMinCrit: 5, phMin: 5.0, phMax: 6.5, clayMin: 30, clayMax: 55 },
  cacao: { kc: 0.9, nFix: 0, cover: 0.95, residue: 0.6, root: 0.85, pest: 0.7, income: 0.85, drought: 0.45, heat: 0.4, labor: 0.7, family: "perennial", tOptMin: 20, tOptMax: 30, tMaxCrit: 34, tMinCrit: 8, phMin: 5.5, phMax: 7.0, clayMin: 20, clayMax: 45 },
  pastura: { kc: 0.8, nFix: 0.3, cover: 1.0, residue: 0.7, root: 0.9, pest: 0.5, income: 0.3, drought: 0.75, heat: 0.85, labor: 0.2, family: "cover", tOptMin: 18, tOptMax: 30, tMaxCrit: 38, tMinCrit: 0, phMin: 5.0, phMax: 7.5, clayMin: 15, clayMax: 45 },
};

export type Rotation = { id: string; crops: CropId[] };

export const ROTATIONS: Rotation[] = [
  { id: "r1", crops: ["maiz", "frijol", "cobertura"] },
  { id: "r2", crops: ["frijol", "maiz", "sorgo"] },
  { id: "r3", crops: ["cafe", "frijol", "cobertura"] },
  { id: "r4", crops: ["arroz", "frijol", "maiz"] },
  { id: "r5", crops: ["yuca", "frijol", "cobertura"] },
  { id: "r6", crops: ["platano", "cacao", "cobertura"] },
  { id: "r7", crops: ["pastura", "maiz", "frijol"] },
  { id: "r8", crops: ["sorgo", "frijol", "cobertura"] },
];

export type Priorities = {
  water: number;
  income: number;
  risk: number;
  soil: number;
  labor: number;
};

export type Scenario = { rain: number; temp: number };

export type ClimateSite = {
  annual: { ppt: number; et0: number; tmean: number; aridity: number };
  trends: { t2m: number; ppt: number };
  hazards: { frost: number; heat: number; drought: number; erosivity: number };
  soil: { clay: number; sand: number; om: number; ph: number; cec: number };
  climate: {
    t2m: number[];
    tmax: number[];
    tmin: number[];
    ppt: number[];
    et0: number[];
    rh: number[];
    wind: number[];
    solar: number[];
  };
};

export type Axes = {
  water: number;
  cover: number;
  nutrients: number;
  erosion: number;
  pest: number;
  income: number;
  resilience: number;
  labor: number;
};

export type Reason = { code: string; value: number };

export type Result = {
  id: string;
  crops: CropId[];
  axes: Axes;
  total: number;
  reasons: Reason[];
};

export type FactorStatus = "ok" | "warn" | "bad";

export type Factor = {
  key: "water" | "temperature" | "soil" | "risk";
  score: number;
  status: FactorStatus;
};

export type Viability = {
  crop: CropId;
  total: number;
  verdict: "high" | "medium" | "low" | "none";
  factors: Factor[];
  limits: { code: string; value: number }[];
};

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

const statusOf = (score: number): FactorStatus =>
  score >= 70 ? "ok" : score >= 45 ? "warn" : "bad";

/* ---------------- viabilidad del cultivo actual ---------------- */

export function evaluateCrop(cropId: CropId, site: ClimateSite, s: Scenario): Viability {
  const c = CROPS[cropId];

  const ppt = site.annual.ppt * (1 + s.rain / 100);
  const et0 = site.annual.et0 * (1 + s.temp * 0.05);
  const balance = ppt / Math.max(1, et0 * c.kc);
  const water = clamp((balance / 1.2) * 100);

  const tmean = site.annual.tmean + s.temp * 0.6;
  let tBase = 100;
  if (tmean < c.tOptMin) tBase -= (c.tOptMin - tmean) * 12;
  if (tmean > c.tOptMax) tBase -= (tmean - c.tOptMax) * 12;

  const heatMonths = site.climate.tmax.filter((t) => t > c.tMaxCrit).length;
  const frostMonths = site.climate.tmin.filter((t) => t < c.tMinCrit).length;
  const temperature = clamp(tBase - heatMonths * 7 - frostMonths * 10);

  const phFit =
    site.soil.ph >= c.phMin && site.soil.ph <= c.phMax
      ? 100
      : clamp(
          100 -
            Math.max(
              0,
              site.soil.ph < c.phMin ? c.phMin - site.soil.ph : site.soil.ph - c.phMax,
            ) *
              25,
        );
  const clayFit =
    site.soil.clay >= c.clayMin && site.soil.clay <= c.clayMax
      ? 100
      : clamp(
          100 -
            Math.max(
              0,
              site.soil.clay < c.clayMin
                ? c.clayMin - site.soil.clay
                : site.soil.clay - c.clayMax,
            ) *
              2.5,
        );
  const omFit = clamp((site.soil.om / 3) * 100);
  const soil = clamp(phFit * 0.45 + clayFit * 0.4 + omFit * 0.15);

  const risk = clamp(
    100 -
      (site.hazards.drought * (1 - c.drought) * 55 +
        site.hazards.heat * (1 - c.heat) * 45 +
        site.hazards.frost * 30 +
        site.hazards.erosivity * (1 - c.cover) * 35),
  );

  const factors: Factor[] = [
    { key: "water", score: water, status: statusOf(water) },
    { key: "temperature", score: temperature, status: statusOf(temperature) },
    { key: "soil", score: soil, status: statusOf(soil) },
    { key: "risk", score: risk, status: statusOf(risk) },
  ];

  const total = clamp(water * 0.35 + temperature * 0.3 + soil * 0.2 + risk * 0.15);
  const verdict =
    total >= 75 ? "high" : total >= 55 ? "medium" : total >= 35 ? "low" : "none";

  const limits: { code: string; value: number }[] = [];
  if (water < 45) limits.push({ code: "water_low", value: Math.round(water) });
  if (temperature < 70) {
    if (tmean > c.tOptMax) limits.push({ code: "temp_high", value: Math.round(tmean) });
    else limits.push({ code: "temp_low", value: Math.round(tmean) });
  }
  if (frostMonths > 0) limits.push({ code: "frost", value: frostMonths });
  if (phFit < 65) limits.push({ code: "soil_ph", value: site.soil.ph });
  if (clayFit < 60) limits.push({ code: "soil_texture", value: site.soil.clay });
  if (omFit < 45) limits.push({ code: "soil_om", value: site.soil.om });
  if (risk < 50) limits.push({ code: "risk", value: Math.round(risk) });

  return { crop: cropId, total, verdict, factors, limits: limits.slice(0, 3) };
}

/* ---------------- rotaciones ---------------- */

export function evaluateRotation(
  rotation: Rotation,
  m: ClimateSite,
  p: Priorities,
  s: Scenario,
): Result {
  const crops = rotation.crops.map((id) => CROPS[id]);

  const ppt = m.annual.ppt * (1 + s.rain / 100);
  const et0 = m.annual.et0 * (1 + s.temp * 0.05);
  const kc = mean(crops.map((c) => c.kc));
  const balance = ppt / Math.max(1, et0 * kc);
  const water = clamp((balance / 1.15) * 100);

  const cover = clamp(mean(crops.map((c) => c.cover)) * 100);
  const nutrients = clamp(mean(crops.map((c) => c.nFix)) * 70 + mean(crops.map((c) => c.residue)) * 30);

  const erosionRisk = (1 - mean(crops.map((c) => c.cover))) * m.hazards.erosivity;
  const erosion = clamp((1 - erosionRisk) * 100);

  const families = new Set(crops.map((c) => c.family)).size;
  const pest = clamp((families / 3) * 70 + mean(crops.map((c) => c.pest)) * 30);

  const income = clamp(mean(crops.map((c) => c.income)) * 100);

  const droughtFit = mean(crops.map((c) => c.drought));
  const heatFit = mean(crops.map((c) => c.heat));
  const resilience = clamp(
    (droughtFit * 0.5 + heatFit * 0.3 + (1 - m.hazards.drought) * 0.2) * 100 - s.temp * 6,
  );

  const labor = clamp((1 - mean(crops.map((c) => c.labor))) * 100);

  const axes: Axes = { water, cover, nutrients, erosion, pest, income, resilience, labor };

  const w = { water: p.water, income: p.income, risk: p.risk, soil: p.soil, labor: p.labor };
  const mapped = {
    water: axes.water,
    income: axes.income,
    risk: axes.erosion * 0.55 + axes.resilience * 0.45,
    soil: axes.cover * 0.5 + axes.nutrients * 0.5,
    labor: axes.labor,
  };
  const wSum = w.water + w.income + w.risk + w.soil + w.labor || 1;
  const total = clamp(
    (w.water * mapped.water +
      w.income * mapped.income +
      w.risk * mapped.risk +
      w.soil * mapped.soil +
      w.labor * mapped.labor) / wSum,
  );

  const reasons: Reason[] = [];
  if (axes.water >= 68) reasons.push({ code: "water_high", value: Math.round(axes.water) });
  if (axes.water < 45) reasons.push({ code: "water_low", value: Math.round(axes.water) });
  if (axes.nutrients >= 55) reasons.push({ code: "nitrogen", value: Math.round(axes.nutrients) });
  if (axes.cover >= 70) reasons.push({ code: "cover", value: Math.round(axes.cover) });
  if (axes.pest >= 70) reasons.push({ code: "pest", value: Math.round(axes.pest) });
  if (axes.erosion >= 75) reasons.push({ code: "erosion", value: Math.round(axes.erosion) });
  if (axes.resilience >= 60) reasons.push({ code: "resilience", value: Math.round(axes.resilience) });
  if (axes.income >= 65) reasons.push({ code: "income", value: Math.round(axes.income) });
  if (axes.labor >= 65) reasons.push({ code: "labor", value: Math.round(axes.labor) });

  return { ...rotation, axes, total, reasons: reasons.slice(0, 3) };
}

export function evaluateAll(m: ClimateSite, p: Priorities, s: Scenario): Result[] {
  return ROTATIONS.map((r) => evaluateRotation(r, m, p, s)).sort((a, b) => b.total - a.total);
}
