import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { geoContains } from "d3-geo";
import { boundsOverlap, countriesInView, loadWorldIndex, worldArea } from "../src/map/world";

const fetchFiles = () => vi.stubGlobal("fetch", vi.fn(async (url: string) =>
  new Response(readFileSync(new URL(`../public/${url.replace(/^\//, "")}`, import.meta.url), "utf8"))));
afterEach(() => vi.unstubAllGlobals());

describe("worldwide administrative boundaries", () => {
  it("keeps both sides of the date line visible and rejects distant bounds", () => {
    const view = { west: 170, east: -170, south: -25, north: 0 };
    expect(boundsOverlap([175, -20, 179, -10], view)).toBe(true);
    expect(boundsOverlap([-179, -20, -175, -10], view)).toBe(true);
    expect(boundsOverlap([0, -20, 10, -10], view)).toBe(false);
    expect(boundsOverlap([175, 20, 179, 30], view)).toBe(false);
    expect(boundsOverlap([175, -20, -175, -10], { ...view, west: -540, east: 540 })).toBe(true);
  });

  it("covers continents, selects local polygons, and retains neighboring countries", async () => {
    fetchFiles();
    const index = await loadWorldIndex();
    expect(index.countries.length).toBeGreaterThan(200);
    expect(index.source.license).toBe("CC BY 4.0");
    const examples = [
      { lat: 2.9345, lon: -75.2809, name: "Huila", local: "Neiva" },
      { lat: 48.8566, lon: 2.3522, name: "France" },
      { lat: 38.5816, lon: -121.4944, name: "California" },
      { lat: -1.2864, lon: 36.8172, name: "Kenya" },
      { lat: 39.9042, lon: 116.4074, name: "China" },
      { lat: -33.8688, lon: 151.2093, name: "Australia" },
      { lat: -18.1416, lon: 178.4419, name: "Fiji" },
    ];
    for (const {lat, lon, name, local} of examples) {
      const region = await worldArea(lat, lon, 6);
      expect(region?.name, `${lat},${lon}`).toContain(name);
      expect(geoContains({ type: "Feature", properties: {}, geometry: region!.polygon }, [lon, lat])).toBe(true);
      const municipality = await worldArea(lat, lon, 10);
      expect(municipality?.polygon, `${lat},${lon} local`).toBeTruthy();
      if (local) expect(municipality!.name).toContain(local);
    }
    const neighbors = countriesInView(index, { west: -80, south: -2, east: -66, north: 12 }, [-74, 4]);
    expect(neighbors.map(country => country.properties.id)).toEqual(expect.arrayContaining(["COL", "ECU", "VEN"]));
    const huila = countriesInView(index, { west: -77, south: 1, east: -74, north: 4 }, [-75.5, 2.5]);
    expect(huila.map(country => country.properties.id)).not.toContain("USA");
    // An ocean click must not inherit a distant administrative polygon.
    expect(await worldArea(0, -140, 10)).toBeNull();
  });
});
