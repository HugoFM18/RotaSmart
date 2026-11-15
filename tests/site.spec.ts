import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSite, monthlyClimatology } from "../src/site";
import { evaluateAll, evaluateCrop } from "../src/engine";
import { readFileSync } from "node:fs";

function series(value: number | ((year: number, month: number) => number)) {
  return Object.fromEntries(Array.from({ length: 20 }, (_, i) => 2005 + i).flatMap(year =>
    Array.from({ length: 13 }, (_, i) => i + 1).map(month => [`${year}${String(month).padStart(2, "0")}`, month === 13 ? 99999 : typeof value === "number" ? value : value(year, month)])));
}
const power = (temperature = 25) => ({ properties: { parameter: {
  T2M: series(temperature), T2M_MAX: series(temperature + 5), T2M_MIN: series(temperature - 5), PRECTOTCORR: series(4),
  RH2M: series(70), WS2M: series(2), ALLSKY_SFC_SW_DWN: series(18),
} } });
afterEach(() => vi.unstubAllGlobals());

describe("NASA monthly climate ingestion", () => {
  it("ignores YYYY13 and averages every year rather than returning the first year", () => {
    const values = series(year => year - 2005);
    expect(monthlyClimatology({ T2M: values }, "T2M")).toEqual(Array(12).fill(9.5));
  });

  it("preserves legitimate zeros and excludes fill values from the sample count", () => {
    const values = series(0);
    values["200501"] = -999;
    expect(monthlyClimatology({ T2M: values }, "T2M")).toEqual(Array(12).fill(0));
  });

  it("rejects missing or non-finite core months instead of inventing zero weather", () => {
    for (const bad of [-999, NaN, Infinity]) {
      const values = series((_, month) => month === 2 ? bad : 20);
      expect(() => monthlyClimatology({ T2M: values }, "T2M")).toThrow("incomplete");
    }
  });

  it("converts daily precipitation with the calendar of each year, including leap days", () => {
    const result = monthlyClimatology({ PRECTOTCORR: series(1) }, "PRECTOTCORR", true);
    expect(result[0]).toBe(31);
    expect(result[1]).toBe(28.25);
  });

  it("does not manufacture fertile soil or high aridity ratios for frozen sites", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(power(-35))));
    vi.stubGlobal("fetch", fetcher);
    const antarctica = await fetchSite(-75, 123);
    expect(antarctica.soilSource).toBe("unavailable");
    expect(antarctica.soil).toBeNull();
    expect(antarctica.annual.aridity).toBeNull();
    expect(antarctica.annual.et0).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(evaluateCrop("sorgo", antarctica, { rain: 0, temp: 0 })).toMatchObject({ total: 0, verdict: "none" });
    expect(evaluateAll(antarctica, { water: 0, income: 100, risk: 0, soil: 0, labor: 0 }, { rain: 0, temp: 0 }).some(r => r.eligible)).toBe(false);
  });

  it("stops the evaluation when NASA lacks valid climate coverage", async () => {
    const response = power();
    response.properties.parameter.T2M = series(-999);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(response))));
    await expect(fetchSite(2, -75)).rejects.toThrow("incomplete");
  });
});

describe("NASA 2005–2024 geographic regressions", () => {
  it.each([
    { name: "antarctica", lat: -75.1, lon: 123.3, blocked: true },
    { name: "sahara", lat: 25, lon: 10, blocked: true },
    { name: "neiva", lat: 2.9345, lon: -75.2809, blocked: false },
    { name: "temperate", lat: 45, lon: -93, blocked: false },
  ])("evaluates $name from recorded public NASA data", async ({ name, lat, lon, blocked }) => {
    const fixture = readFileSync(new URL(`./fixtures/climate/${name}.json`, import.meta.url), "utf8");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("power.larc.nasa.gov") ? new Response(fixture) : new Response("", { status: 503 })));
    const result = await fetchSite(lat, lon);
    const sorgo = evaluateCrop("sorgo", result, { rain: 0, temp: 0 });
    expect(sorgo.verdict === "none", `${name}: ${sorgo.total}`).toBe(blocked);
    expect(sorgo.verdict).not.toBe("unavailable");
    if (blocked) {
      expect(sorgo.total).toBe(0);
      expect(evaluateAll(result, { water: 0, income: 100, risk: 0, soil: 0, labor: 0 }, { rain: 0, temp: 0 }).some(r => r.eligible)).toBe(false);
    } else {
      expect(["high", "medium"]).toContain(sorgo.verdict);
    }
  });
});
