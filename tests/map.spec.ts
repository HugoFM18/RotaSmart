import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { geoArea, geoContains, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { createProjection, fitArea, pointOnGlobe, sphericalGeometry } from "../src/map/geometry";
import type { Boundaries } from "../src/map/boundaries";
import type { BBox } from "../src/store";

const readTopology = (file: string) => JSON.parse(readFileSync(new URL(`../public/data/${file}`, import.meta.url), "utf8"));
const decode = (file: string) => {
  const topo = readTopology(file);
  return feature(topo, topo.objects.boundaries) as unknown as Boundaries;
};
const departments = decode("colombia/departments.json");

afterEach(() => vi.unstubAllGlobals());

describe("3D framing", () => {
  it.each([{ w: 960, h: 640 }, { w: 390, h: 360 }])("fits a municipality and keeps its neighbors visible in %j", size => {
    const bbox: BBox = [1.64, -76.23, 2.04, -75.84];
    const view = fitArea(bbox, size);
    expect(view.zoom).toBeGreaterThan(8);
    const projection = createProjection(view, size);
    for (const point of [[bbox[1], bbox[0]], [bbox[3], bbox[2]]]) {
      const p = projection(point as [number, number])!;
      expect(p[0]).toBeGreaterThan(size.w * 0.1);
      expect(p[0]).toBeLessThan(size.w * 0.9);
      expect(p[1]).toBeGreaterThan(size.h * 0.1);
      expect(p[1]).toBeLessThan(size.h * 0.9);
    }
  });

  it("rejects clicks in space, rather than selecting a faraway coordinate", () => {
    const projection = createProjection({ rotation: [75, -3], zoom: 1 }, { w: 900, h: 600 });
    expect(pointOnGlobe(0, 0, projection)).toBeNull();
    const center = pointOnGlobe(450, 300, projection)!;
    expect(center[0]).toBeCloseTo(-75, 8);
    expect(center[1]).toBeCloseTo(3, 8);
  });

  it("renders RFC 7946 polygons as a small local region without mutating the source", () => {
    const source = { type: "Polygon" as const, coordinates: [[[-76, 2], [-75, 2], [-75, 3], [-76, 3], [-76, 2]]] };
    const original = structuredClone(source);
    const area = sphericalGeometry(source)!;
    expect(geoArea(area)).toBeLessThan(0.01);
    expect(geoContains(area, [-75.5, 2.5])).toBe(true);
    expect(source).toEqual(original);
  });
});

describe("Colombian administrative detail", () => {
  it("ships all departments and municipalities with valid local polygon winding", () => {
    expect(departments.features).toHaveLength(33);
    let count = 0;
    for (const department of departments.features) {
      expect(department.bbox).toHaveLength(4);
      expect(geoArea(department)).toBeLessThan(0.1);
      const municipalities = decode(`colombia/${department.properties.file}`);
      count += municipalities.features.length;
      for (const municipality of municipalities.features) {
        expect(municipality.bbox).toHaveLength(4);
        expect(geoArea(municipality)).toBeLessThan(0.1);
      }
    }
    expect(count).toBe(1122);
  });

  it("selects both Huila and Neiva from local files and reuses the downloaded department", async () => {
    vi.resetModules();
    const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(readTopology(url.replace(/^.*?data\//, "")))));
    vi.stubGlobal("fetch", fetcher);
    const { localArea } = await import("../src/map/boundaries");
    const department = await localArea(2.9345, -75.2809, 6);
    expect(department?.name).toBe("Huila, Colombia");
    const municipality = await localArea(2.9345, -75.2809, 10);
    expect(municipality?.name).toBe("Neiva, Huila, Colombia");
    await localArea(2.9345, -75.2809, 10);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const view = fitArea(municipality!.bbox, { w: 960, h: 640 });
    const selected = sphericalGeometry(municipality!.polygon)!;
    expect(geoPath(createProjection(view, { w: 960, h: 640 }))(selected)).toBeTruthy();
  });

  it("retries a failed file download instead of caching the failure forever", async () => {
    vi.resetModules();
    const fetcher = vi.fn().mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(readTopology("colombia/departments.json"))));
    vi.stubGlobal("fetch", fetcher);
    const { loadDepartments } = await import("../src/map/boundaries");
    await expect(loadDepartments()).rejects.toThrow("503");
    await expect(loadDepartments()).resolves.toMatchObject({ type: "FeatureCollection" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
