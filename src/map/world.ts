import { geoArea, geoBounds, geoContains, geoDistance } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { BBox } from "../store";
import { loadMapData } from "./boundaries";
import type { Boundaries, Boundary } from "./boundaries";

export type WorldCountry = Boundary & { properties: Boundary["properties"] & {
  country: string; levels: Partial<Record<1 | 2, string>>; counts: Partial<Record<1 | 2, number>>;
} };
export type WorldIndex = { countries: WorldCountry[]; source: { name: string; url: string; license: string; generatedAt: string } };
export type GeographicBounds = { west: number; south: number; east: number; north: number };
type BoundaryTopology = Topology<{ boundaries: GeometryCollection }>;
const decoded = new Map<string, Promise<Boundaries>>();
let indexPromise: Promise<WorldIndex> | null = null;
const partBounds = new WeakMap<WorldCountry, number[][]>();

function normalize(collection: Boundaries) {
  // d3 selection uses spherical winding; MapLibre accepts both windings for rendering.
  for (const item of collection.features) {
    const g = item.geometry;
    for (const coordinates of g.type === "Polygon" ? [g.coordinates] : g.coordinates) {
      if (geoArea({ type: "Polygon", coordinates }) > Math.PI * 2) coordinates.forEach(ring => ring.reverse());
    }
  }
  return collection;
}

export function loadWorldIndex(): Promise<WorldIndex> {
  if (!indexPromise) indexPromise = loadMapData<BoundaryTopology & { source: WorldIndex["source"] }>("world/index.json")
    .then(topo => ({ countries: normalize(feature(topo, topo.objects.boundaries) as Boundaries).features as WorldCountry[], source: topo.source }))
    .catch(error => { indexPromise = null; throw error; });
  return indexPromise;
}

export function loadWorldBoundaries(country: WorldCountry, level: 1 | 2): Promise<Boundaries> {
  const file = country.properties.levels[level] ?? country.properties.levels[1];
  if (!file) return Promise.resolve({ type: "FeatureCollection", features: [] });
  let promise = decoded.get(file);
  if (!promise) {
    promise = loadMapData<BoundaryTopology>(`world/${file}`)
      .then(topo => normalize(feature(topo, topo.objects.boundaries) as Boundaries))
      .catch(error => { if (decoded.get(file) === promise) decoded.delete(file); throw error; });
  }
  decoded.delete(file);
  decoded.set(file, promise);
  // Exploration of the whole globe must not keep every country's geometry in memory.
  while (decoded.size > 8) decoded.delete(decoded.keys().next().value!);
  return promise;
}

function longitudeIntervals(west: number, east: number): [number, number][] {
  if (Math.abs(east - west) >= 359.999) return [[-180, 180]];
  const wrap = (v: number) => ((v + 180) % 360 + 360) % 360 - 180;
  const w = wrap(west), e = wrap(east);
  return w <= e ? [[w, e]] : [[w, 180], [-180, e]];
}

export function boundsOverlap(bbox: number[], view: GeographicBounds) {
  const [west, south, east, north] = bbox;
  if (south > view.north || north < view.south) return false;
  return longitudeIntervals(west, east).some(a => longitudeIntervals(view.west, view.east).some(b => a[0] <= b[1] && b[0] <= a[1]));
}

export function countriesInView(index: WorldIndex, view: GeographicBounds, center: [number, number], limit = 12) {
  return index.countries.filter(country => boundsOverlap(country.bbox, view))
    .filter(country => {
      let parts = partBounds.get(country);
      if (!parts) {
        const polygons = country.geometry.type === "Polygon" ? [country.geometry.coordinates] : country.geometry.coordinates;
        parts = polygons.map(coordinates => geoBounds({ type: "Polygon", coordinates }).flat());
        partBounds.set(country, parts);
      }
      // An overseas territory must not make a distant mainland count as a neighbor.
      return parts.some(bbox => boundsOverlap(bbox, view));
    })
    .sort((a, b) => geoDistance(a.properties.center, center) - geoDistance(b.properties.center, center))
    .slice(0, limit);
}

export async function worldArea(lat: number, lon: number, zoom: number) {
  const index = await loadWorldIndex();
  const point: [number, number] = [lon, lat];
  const contains = (candidate: Boundary) => boundsOverlap(candidate.bbox, { west: lon, east: lon, south: lat, north: lat }) && geoContains(candidate, point);
  // Overview coastlines are deliberately coarse. Confirm against detailed units,
  // including nearby countries, so coastal towns do not fall through the outline.
  const candidates = index.countries.filter(country => boundsOverlap(country.bbox, {
    west: lon - 0.1, east: lon + 0.1, south: lat - 0.1, north: lat + 0.1,
  })).sort((a, b) => Number(geoContains(b, point)) - Number(geoContains(a, point)) ||
    geoDistance(a.properties.center, point) - geoDistance(b.properties.center, point)).slice(0, 4);
  for (const country of candidates) {
    const parents = await loadWorldBoundaries(country, 1);
    const parent = parents.features.find(contains);
    const collection = zoom >= 9 || !parent ? await loadWorldBoundaries(country, 2) : parents;
    const selected = collection.features.find(contains) ?? parent;
    if (!selected) continue;
    const [west, south, east, north] = selected.bbox;
    return { polygon: selected.geometry, bbox: [south, west, north, east] as BBox,
      name: [...new Set([selected.properties.name, ...(parent ? [parent.properties.name] : []), country.properties.name])].join(", ") };
  }
  return null;
}
