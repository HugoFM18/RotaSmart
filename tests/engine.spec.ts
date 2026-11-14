import { describe, it, expect } from "vitest";
import { evaluateAll, ROTATIONS, type MuniData, type Priorities } from "../src/engine";

const priorities: Priorities = { water: 70, income: 50, risk: 60, soil: 65, labor: 40 };

const muni: MuniData = {
  id: "test",
  name: "Test",
  lat: 2.9,
  lon: -75.3,
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
    const results = evaluateAll(muni, priorities, { rain: 0, temp: 0 });
    expect(results).toHaveLength(ROTATIONS.length);
    for (const r of results) {
      expect(r.total).toBeGreaterThanOrEqual(0);
      expect(r.total).toBeLessThanOrEqual(100);
      expect(Number.isFinite(r.total)).toBe(true);
    }
  });

  it("ordena de mayor a menor", () => {
    const results = evaluateAll(muni, priorities, { rain: 0, temp: 0 });
    const totals = results.map((r) => r.total);
    expect([...totals].sort((a, b) => b - a)).toEqual(totals);
  });

  it("un escenario seco reduce el puntaje de las rotaciones exigentes en agua", () => {
    const normal = evaluateAll(muni, priorities, { rain: 0, temp: 0 });
    const dry = evaluateAll(muni, priorities, { rain: -30, temp: 2 });
    const avg = (xs: typeof normal) => xs.reduce((a, b) => a + b.total, 0) / xs.length;
    expect(avg(dry)).toBeLessThan(avg(normal));
  });

  it("priorizar agua cambia el orden frente a priorizar ingreso", () => {
    const waterFirst = evaluateAll(muni, { ...priorities, water: 100, income: 0, risk: 0, soil: 0, labor: 0 }, { rain: 0, temp: 0 });
    const incomeFirst = evaluateAll(muni, { ...priorities, water: 0, income: 100, risk: 0, soil: 0, labor: 0 }, { rain: 0, temp: 0 });
    expect(waterFirst[0].id).not.toBe(incomeFirst[0].id);
  });
});
