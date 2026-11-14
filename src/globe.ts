import { geoBounds, geoDistance, geoOrthographic, geoPath } from "d3-geo";
import type { BBox } from "./store";

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 320;
export const clampZoom = (zoom: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
export const wrapLongitude = (lon: number) => ((lon + 180) % 360 + 360) % 360 - 180;

/** Conservative geographic bounds, calculated once instead of reprojecting the whole world. */
export function indexFeatures(collection: any) {
  return collection.features.map((feature: any) => {
    const [[west, south], [east, north]] = geoBounds(feature);
    const span = east < west ? east + 360 - west : east - west;
    return { feature, center: [wrapLongitude(west + span / 2), (south + north) / 2] as [number, number],
      radius: Math.min(Math.PI, (span + north - south) * Math.PI / 360 + .02) };
  });
}

export function visibleFeatures(index: ReturnType<typeof indexFeatures>, center: [number, number], angle: number) {
  return { type: "FeatureCollection" as const, features: index
    .filter((entry: any) => geoDistance(entry.center, center) <= entry.radius + angle)
    .map((entry: any) => entry.feature) };
}

export function regionView(lat: number, lon: number, bbox: BBox | null, width: number, height: number) {
  const east = bbox && bbox[3] < bbox[1] ? bbox[3] + 360 : bbox?.[3];
  const centerLon = bbox ? wrapLongitude((bbox[1] + east!) / 2) : lon;
  const centerLat = bbox ? (bbox[0] + bbox[2]) / 2 : lat;
  const projection = geoOrthographic().translate([0, 0])
    .scale(Math.max(1, Math.min(width, height) / 2 - 22)).rotate([-centerLon, -centerLat]);
  let zoom = 6;
  if (bbox) {
    const bounds = geoPath(projection).bounds({ type: "MultiPoint", coordinates: [
      [bbox[1], bbox[0]], [east!, bbox[0]], [east!, bbox[2]], [bbox[1], bbox[2]],
    ] });
    zoom = Math.min(width * .72 / Math.max(.001, bounds[1][0] - bounds[0][0]),
      height * .66 / Math.max(.001, bounds[1][1] - bounds[0][1]));
  }
  return { rotation: [-centerLon, -centerLat] as [number, number], zoom: clampZoom(zoom) };
}

export function globePoint(x: number, y: number, width: number, height: number,
  radius: number, rotation: [number, number], zoom: number) {
  // d3 inversion alone returns limb points even outside the visible sphere.
  if (Math.hypot(x - width / 2, y - height / 2) > radius * zoom) return null;
  const point = geoOrthographic().translate([width / 2, height / 2])
    .scale(radius * zoom).rotate(rotation).invert?.([x, y]);
  return point && point.every(Number.isFinite) ? [wrapLongitude(point[0]), point[1]] : null;
}
