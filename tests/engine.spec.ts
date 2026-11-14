import { describe, it, expect } from "vitest";
import {
  evaluateAll,
  evaluateCrop,
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
