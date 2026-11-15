import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fetchClimate, powerCell } from "../src/site";

const recorded = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/climate/${name}.json`, import.meta.url), "utf8"));
function storage() {
  const entries = new Map<string, Response>();
  const key = (request: string | Request) => typeof request === "string" ? request : request.url;
  const cache = {
    match: vi.fn(async (request: string | Request) => entries.get(key(request))?.clone()),
    put: vi.fn(async (request: string | Request, response: Response) => { entries.set(key(request), response.clone()); }),
    delete: vi.fn(async (request: string | Request) => entries.delete(key(request))),
    keys: vi.fn(async () => [...entries.keys()].map(url => new Request(url))),
  };
  vi.stubGlobal("caches", { open: vi.fn(async () => cache) });
  return { entries, cache };
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("fast NASA loading without changing the climate analysis", () => {
  it("uses the native meteorological cell while preserving selected-point coordinates", async () => {
    expect(powerCell(2.9345, -75.2809)).toEqual({ lat: 3, lon: -75 });
    expect(powerCell(2.93, -75.29)).toEqual(powerCell(2.9345, -75.2809));
    expect(powerCell(2.749, -75)).not.toEqual(powerCell(2.751, -75));
    expect(powerCell(10, 179.9).lon).toBe(179.375);
    expect(powerCell(10, -179.9).lon).toBe(-180);
    const fetcher = vi.fn(async (_url: string) => new Response(JSON.stringify(recorded("neiva-grid"))));
    vi.stubGlobal("fetch", fetcher);
    const result = await fetchClimate(2.9345, -75.2809);
    expect(result).toMatchObject({ lat: 2.9345, lon: -75.2809, climateCell: { lat: 3, lon: -75 } });
    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.searchParams.get("parameters")).toBe("T2M,T2M_MAX,T2M_MIN,PRECTOTCORR");
    expect(url.searchParams.get("latitude")).toBe("3.0000");
    expect(url.searchParams.get("longitude")).toBe("-75.0000");
    expect(url.searchParams.get("start")).toBe("2005");
    expect(url.searchParams.get("end")).toBe("2024");
    expect(fetcher).toHaveBeenCalledTimes(1); // Soil cannot hold the NASA result.
    expect(result.soilSource).toBe("estimated");
  });

  it.each(["neiva", "antarctica"])("preserves every recorded NASA temperature/precipitation value in %s", name => {
    const point = recorded(name).properties.parameter;
    const cell = recorded(`${name}-grid`).properties.parameter;
    for (const field of ["T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR"]) expect(cell[field]).toEqual(point[field]);
  });

  it("reuses validated historical data for the same cell across new loads", async () => {
    const { entries } = storage();
    const fetcher = vi.fn(async () => new Response(JSON.stringify(recorded("neiva-grid"))));
    vi.stubGlobal("fetch", fetcher);
    await fetchClimate(2.9345, -75.2809);
    await vi.waitFor(() => expect(entries.size).toBe(1));
    const result = await fetchClimate(2.93, -75.29);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.lat).toBe(2.93);
    expect(result.lon).toBe(-75.29);
  });

  it("discards expired cache entries instead of retaining stale weather forever", async () => {
    const { entries } = storage();
    const fetcher = vi.fn(async () => new Response(JSON.stringify(recorded("neiva-grid"))));
    vi.stubGlobal("fetch", fetcher);
    await fetchClimate(3, -75);
    await vi.waitFor(() => expect(entries.size).toBe(1));
    const url = [...entries.keys()][0];
    entries.set(url, new Response(JSON.stringify({ savedAt: Date.now() - 8 * 86400000, data: recorded("neiva-grid").properties.parameter })));
    await fetchClimate(3, -75);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not cache missing data or confuse one cell with another", async () => {
    const { entries } = storage();
    const bad = recorded("neiva-grid");
    for (const key of Object.keys(bad.properties.parameter.T2M)) bad.properties.parameter.T2M[key] = -999;
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(bad)))
      .mockResolvedValueOnce(new Response(JSON.stringify(recorded("neiva-grid"))))
      .mockResolvedValueOnce(new Response(JSON.stringify(recorded("antarctica-grid"))));
    vi.stubGlobal("fetch", fetcher);
    await expect(fetchClimate(3, -75)).rejects.toThrow("incomplete");
    expect(entries.size).toBe(0);
    await fetchClimate(3, -75);
    await vi.waitFor(() => expect(entries.size).toBe(1));
    const frozen = await fetchClimate(-75.1, 123.3);
    expect(frozen.soilSource).toBe("unavailable");
    expect(frozen.annual.tmean).toBeLessThan(0);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("still returns climate if persistent storage is blocked", async () => {
    vi.stubGlobal("caches", { open: vi.fn().mockRejectedValue(new Error("Storage disabled")) });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(recorded("neiva-grid")))));
    await expect(fetchClimate(3, -75)).resolves.toMatchObject({ soilSource: "estimated" });
  });

  it("cancels an obsolete request without substituting zero weather", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal!.addEventListener("abort", () => reject(init.signal!.reason), { once: true });
    }));
    vi.stubGlobal("fetch", fetcher);
    const result = fetchClimate(3, -75, controller.signal);
    const rejected = expect(result).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    controller.abort();
    await rejected;
  });
});
