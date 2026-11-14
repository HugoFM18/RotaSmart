import { describe, expect, it } from "vitest";
import { geoOrthographic } from "d3-geo";
import { clampZoom, globePoint, indexFeatures, regionView, visibleFeatures, wrapLongitude } from "../src/globe";

describe("globe selection and framing", () => {
  it("ignores clicks outside the planet", () => {
    expect(globePoint(0, 0, 900, 700, 328, [75, -3], 1)).toBeNull();
  });

  it.each([1, 6, 80, 320])("keeps projected clicks accurate at zoom %s", (zoom) => {
    const rotation: [number, number] = [75, -3];
    const projection = geoOrthographic().translate([450, 350]).scale(328 * zoom).rotate(rotation);
    const location: [number, number] = [-75 + .2 / zoom, 3 + .15 / zoom];
    const pixel = projection(location)!;
    const point = globePoint(pixel[0], pixel[1], 900, 700, 328, rotation, zoom)!;
    expect(point[0]).toBeCloseTo(location[0], 6);
    expect(point[1]).toBeCloseTo(location[1], 6);
  });

  it.each([[900, 700], [340, 620], [1200, 400]])("fits the region inside a %s by %s viewport", (w, h) => {
    const bbox: [number, number, number, number] = [1.5, -76.8, 3.8, -74.5];
    const view = regionView(2.9, -75.3, bbox, w, h);
    const projection = geoOrthographic().translate([w / 2, h / 2])
      .scale((Math.min(w, h) / 2 - 22) * view.zoom).rotate(view.rotation);
    for (const location of [[bbox[1], bbox[0]], [bbox[3], bbox[2]]] as [number, number][]) {
      const [x, y] = projection(location)!;
      expect(x).toBeGreaterThan(w * .1);
      expect(x).toBeLessThan(w * .9);
      expect(y).toBeGreaterThan(h * .1);
      expect(y).toBeLessThan(h * .9);
    }
  });

  it("centers a boundary crossing the antimeridian", () => {
    const view = regionView(0, 179, [-2, 178, 2, -178], 900, 700);
    expect(Math.abs(view.rotation[0])).toBe(180);
    expect(view.zoom).toBeGreaterThan(10);
  });

  it("limits zoom and wraps longitudes after repeated rotations", () => {
    expect(clampZoom(1000)).toBe(320);
    expect(clampZoom(.1)).toBe(1);
    expect(wrapLongitude(1085)).toBe(5);
    expect(wrapLongitude(-1085)).toBe(-5);
  });

  it("keeps nearby features and excludes distant features from close views", () => {
    const point = (lon: number, lat: number) => ({ type: "Feature", properties: {},
      geometry: { type: "Point", coordinates: [lon, lat] } });
    const nearby = point(-75, 3);
    const index = indexFeatures({ features: [nearby, point(100, 40)] });
    expect(visibleFeatures(index, [-75, 3], .1).features).toEqual([nearby]);
  });
});
