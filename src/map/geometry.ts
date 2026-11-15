import { geoArea, geoDistance, geoOrthographic, geoPath } from "d3-geo";
import type { GeoProjection } from "d3-geo";
import type { Geometry, Polygon, MultiPolygon, Feature } from "geojson";
import type { BBox } from "../store";
import { wrapLongitude } from "../globe";

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 512;
export type View = { rotation: [number, number]; zoom: number };
export type Size = { w: number; h: number };
export const clampZoom = (zoom: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
export const globeRadius = ({ w, h }: Size) => Math.max(1, Math.min(w, h) / 2 - 22);

export function createProjection(view: View, size: Size): GeoProjection {
  return geoOrthographic()
    .translate([size.w / 2, size.h / 2])
    .scale(globeRadius(size) * view.zoom)
    .rotate([view.rotation[0], view.rotation[1], 0])
    .clipAngle(90)
    .clipExtent([[-24, -24], [size.w + 24, size.h + 24]])
    .precision(0.6);
}

/** Fit the actual projected bounds, including the viewport's aspect ratio. */
export function fitArea(bbox: BBox, size: Size): View {
  const [south, west, north, east] = bbox;
  const span = east < west ? east + 360 - west : east - west;
  const centerLon = wrapLongitude(west + span / 2);
  const rotation: [number, number] = [-centerLon, -(south + north) / 2];
  const projection = geoOrthographic().rotate([...rotation, 0]).translate([0, 0]).scale(1);
  const bounds = geoPath(projection).bounds({
    type: "MultiPoint",
    coordinates: [[west, south], [west, north], [east, south], [east, north], [centerLon, north], [centerLon, south]],
  });
  const width = Math.max(0.00001, bounds[1][0] - bounds[0][0]);
  const height = Math.max(0.00001, bounds[1][1] - bounds[0][1]);
  // Keep neighboring units in view and leave room for controls and labels.
  const scale = Math.min(size.w * 0.68 / width, size.h * 0.68 / height);
  return { rotation, zoom: clampZoom(scale / globeRadius(size)) };
}

export function sphericalGeometry(geometry: Geometry | null): Feature<Polygon | MultiPolygon> | null {
  if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) return null;
  const copy = structuredClone(geometry);
  const polygons = copy.type === "Polygon" ? [copy.coordinates] : copy.coordinates;
  for (const coordinates of polygons) {
    if (geoArea({ type: "Polygon", coordinates }) > 2 * Math.PI) {
      coordinates.forEach(ring => ring.reverse());
    }
  }
  return { type: "Feature", properties: {}, geometry: copy };
}

/** Projection.invert alone also returns coordinates for clicks outside the disk. */
export function pointOnGlobe(x: number, y: number, projection: GeoProjection): [number, number] | null {
  const [cx, cy] = projection.translate();
  if (Math.hypot(x - cx, y - cy) > projection.scale()) return null;
  const point = projection.invert?.([x, y]);
  return point && point.every(Number.isFinite) ? [wrapLongitude(point[0]), point[1]] : null;
}

export function inViewport(point: [number, number], projection: GeoProjection, size: Size, margin = 30) {
  const rotation = projection.rotate();
  if (geoDistance(point, [-rotation[0], -rotation[1]]) >= Math.PI / 2) return null;
  const p = projection(point);
  return p && p[0] >= -margin && p[0] <= size.w + margin && p[1] >= -margin && p[1] <= size.h + margin ? p : null;
}
