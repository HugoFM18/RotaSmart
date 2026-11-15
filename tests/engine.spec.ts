import { describe, it, expect } from "vitest";
import {
  evaluateAll,
  evaluateCrop,
  CROPS,
  type CropId,
  ROTATIONS,
  type ClimateSite,
  type Priorities,
} from "../src/engine";

const priorities: Priorities = { water: 70, income: 50, risk: 60, soil: 65, labor: 40 };

const site: ClimateSite = {
  annual: { ppt: 1300, et0: 1600, tmean: 20, aridity: 0.81 },
  trends: { t2m: 0.3, ppt: 3 },
  hazards: { frost: 0, heat: 0.3, drought: 0.3, erosivity: 0.5 },
  soil: { clay: 26, sand: 48, om: 2.1, ph: 5.9, cec: 17 },
  climate: {
    t2m: Array(12).fill(20),
    tmax: Array(12).fill(26),
    tmin: Array(12).fill(15),
    ppt: Array(12).fill(110),
    et0: Array(12).fill(135),
    rh: Array(12).fill(78),
    wind: Array(12).fill(1.5),
    solar: Array(12).fill(17),
  },
};

describe("motor de rotaciones", () => {
  it("evalúa todas las rotaciones con puntajes válidos", () => {
    const results = evaluateAll(site, priorities, { rain: 0, temp: 0 });
    expect(results).toHaveLength(ROTATIONS.length);
    for (const r of results) {
      expect(r.total).toBeGreaterThanOrEqual(0);
      expect(r.total).toBeLessThanOrEqual(100);
      expect(Number.isFinite(r.total)).toBe(true);
    }
  });

  it("ordena de mayor a menor", () => {
    const results = evaluateAll(site, priorities, { rain: 0, temp: 0 });
    const totals = results.map((r) => r.total);
    expect([...totals].sort((a, b) => b - a)).toEqual(totals);
  });

  it("un escenario seco reduce el puntaje promedio", () => {
    const normal = evaluateAll(site, priorities, { rain: 0, temp: 0 });
    const dry = evaluateAll(site, priorities, { rain: -30, temp: 2 });
    const avg = (xs: typeof normal) => xs.reduce((a, b) => a + b.total, 0) / xs.length;
    expect(avg(dry)).toBeLessThan(avg(normal));
  });

  it("priorizar agua cambia el orden frente a priorizar ingreso", () => {
    const waterFirst = evaluateAll(
      site,
      { ...priorities, water: 100, income: 0, risk: 0, soil: 0, labor: 0 },
      { rain: 0, temp: 0 },
    );
    const incomeFirst = evaluateAll(
      site,
      { ...priorities, water: 0, income: 100, risk: 0, soil: 0, labor: 0 },
      { rain: 0, temp: 0 },
    );
    expect(waterFirst[0].id).not.toBe(incomeFirst[0].id);
  });
});

const climateSite = (temperatures: number[], rain: number[], minimum = temperatures.map(t => t - 5)): ClimateSite => ({
  ...structuredClone(site),
  annual: { tmean: temperatures.reduce((a, b) => a + b, 0) / 12, ppt: rain.reduce((a, b) => a + b, 0), et0: 1200, aridity: 1 },
  climate: { ...structuredClone(site.climate), t2m: temperatures, tmin: minimum, tmax: temperatures.map(t => t + 5), ppt: rain, et0: Array(12).fill(100) },
});

describe("essential growing requirements", () => {
  it("rejects every crop and rotation in Antarctica despite favorable soil, low ET0, or income priority", () => {
    const antarctica = climateSite(Array(12).fill(-35), Array(12).fill(4));
    antarctica.annual.et0 = 0;
    antarctica.climate.et0 = Array(12).fill(0);
    for (const crop of Object.keys(CROPS) as CropId[]) {
      for (const scenario of [{ rain: 0, temp: 0 }, { rain: 30, temp: 3 }]) {
        const result = evaluateCrop(crop, antarctica, scenario);
        expect(result.total, crop).toBe(0);
        expect(result.verdict).toBe("none");
        expect(result.limits[0].code).toBe("frozen_climate");
        expect(result.factors.find(f => f.key === "water")!.score).toBe(0);
      }
    }
    const rotations = evaluateAll(antarctica, { water: 0, income: 100, risk: 0, soil: 0, labor: 0 }, { rain: 0, temp: 0 });
    expect(rotations.every(result => result.total === 0 && !result.eligible && result.reasons.length === 0)).toBe(true);
  });

  it("does not confuse drought tolerance with cultivation without water", () => {
    const desert = climateSite(Array(12).fill(29), Array(12).fill(0.5));
    expect(evaluateCrop("sorgo", desert, { rain: 30, temp: 0 })).toMatchObject({ total: 0, verdict: "none" });
    expect(evaluateAll(desert, priorities, { rain: 0, temp: 0 }).every(r => !r.eligible)).toBe(true);
  });

  it("does not use winter rainfall to fund a dry summer crop", () => {
    const summer = climateSite([2, 3, 8, 10, 22, 25, 26, 24, 10, 8, 3, 2], [200, 200, 200, 200, 1, 1, 1, 1, 200, 200, 200, 200]);
    expect(evaluateCrop("sorgo", summer, { rain: 0, temp: 0 })).toMatchObject({ total: 0, verdict: "none" });
  });

  it("allows a temperate summer crop despite a freezing winter", () => {
    const temperate = climateSite([-10, -7, 0, 8, 16, 23, 25, 24, 18, 10, 0, -8], Array(12).fill(120));
    const result = evaluateCrop("maiz", temperate, { rain: 0, temp: 0 });
    expect(["high", "medium"]).toContain(result.verdict);
    expect(result.season).toMatchObject({ months: 4 });
    expect(result.limits.some(l => l.code === "frost")).toBe(false);
    expect(evaluateCrop("cacao", temperate, { rain: 0, temp: 0 }).total).toBe(0);
  });

  it("supports Southern Hemisphere seasons that cross the year boundary", () => {
    const southern = climateSite([26, 25, 22, 10, 5, 0, -2, 2, 7, 10, 22, 25], Array(12).fill(150));
    const result = evaluateCrop("sorgo", southern, { rain: 0, temp: 0 });
    expect(["high", "medium"]).toContain(result.verdict);
    expect(result.season!.start + result.season!.months).toBeGreaterThan(12);
  });

  it("applies temperature scenarios to monthly growing windows", () => {
    const borderline = climateSite(Array(12).fill(14), Array(12).fill(150));
    expect(evaluateCrop("sorgo", borderline, { rain: 0, temp: 0 }).total).toBe(0);
    expect(evaluateCrop("sorgo", borderline, { rain: 0, temp: 3 }).season).toBeDefined();
  });

  it("does not compensate incompatible temperature with plentiful water and good soil", () => {
    const tooHot = climateSite(Array(12).fill(38), Array(12).fill(400));
    const result = evaluateCrop("cafe", tooHot, { rain: 0, temp: 0 });
    expect(result.verdict).toBe("none");
    expect(result.total).toBe(0);
  });

  it("distinguishes missing climate from an unsuitable climate", () => {
    for (const value of [NaN, Infinity, -999]) {
      const invalid = structuredClone(site);
      invalid.climate.t2m[0] = value;
      expect(evaluateCrop("sorgo", invalid, { rain: 0, temp: 0 }).verdict).toBe("unavailable");
      expect(evaluateAll(invalid, priorities, { rain: 0, temp: 0 }).every(r => !r.eligible && Number.isFinite(r.total))).toBe(true);
    }
  });

  it("does not certify cultivable soil when soil data is absent or corrupt", () => {
    for (const soil of [null, { ...site.soil!, ph: NaN }]) {
      const result = evaluateCrop("maiz", { ...site, soil }, { rain: 0, temp: 0 });
      expect(result.total).toBeLessThan(55);
      expect(result.limits.some(l => l.code === "soil_unavailable")).toBe(true);
    }
  });
});

describe("viabilidad del cultivo", () => {
  it("devuelve un veredicto válido y cuatro factores", () => {
    const v = evaluateCrop("maiz", site, { rain: 0, temp: 0 });
    expect(v.factors).toHaveLength(4);
    expect(["high", "medium", "low", "none"]).toContain(v.verdict);
    expect(v.total).toBeGreaterThanOrEqual(0);
    expect(v.total).toBeLessThanOrEqual(100);
  });

  it("el café sufre más el calor que el maíz", () => {
    const hot: ClimateSite = {
      ...site,
      annual: { ...site.annual, tmean: 31 },
      climate: { ...site.climate, t2m: Array(12).fill(31), tmax: Array(12).fill(37) },
    };
    const cafe = evaluateCrop("cafe", hot, { rain: 0, temp: 0 });
    const maiz = evaluateCrop("maiz", hot, { rain: 0, temp: 0 });
    const tempOf = (v: typeof cafe) =>
      v.factors.find((f) => f.key === "temperature")!.score;
    expect(tempOf(cafe)).toBeLessThan(tempOf(maiz));
  });

  it("un suelo muy ácido limita el cultivo y aparece como limitante", () => {
    const acid: ClimateSite = { ...site, soil: { ...site.soil, ph: 4.2 } };
    const v = evaluateCrop("maiz", acid, { rain: 0, temp: 0 });
    expect(v.limits.some((l) => l.code === "soil_ph")).toBe(true);
  });
});
