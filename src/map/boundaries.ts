import { geoDistance } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";
import type { GeoProjection } from "d3-geo";
import type { Size } from "./geometry";
import { worldArea } from "./world";

export type Boundary = Omit<Feature<Polygon | MultiPolygon, {
  id: string; name: string; center: [number, number]; file?: string;
}>, "bbox"> & { bbox: [number, number, number, number] };
export type Boundaries = Omit<FeatureCollection<Polygon | MultiPolygon, Boundary["properties"]>, "features"> & { features: Boundary[] };

const requests = new Map<string, Promise<unknown>>();
/** Deduplicate requests across both maps; failures can be retried on the next visit. */
export function loadMapData<T>(file: string): Promise<T> {
  let promise = requests.get(file);
  if (!promise) {
    promise = fetch(`${import.meta.env.BASE_URL}data/${file}`, { signal: AbortSignal.timeout(30000) })
      .then(response => {
        if (!response.ok) throw new Error(`Map data ${response.status}: ${file}`);
        return response.json();
      })
      .catch(error => { if (requests.get(file) === promise) requests.delete(file); throw error; });
    requests.set(file, promise);
  }
  requests.delete(file);
  requests.set(file, promise);
  if (requests.size > 20) {
    const oldestWorldFile = [...requests.keys()].find(key => key.startsWith("world/") && key !== "world/index.json");
    if (oldestWorldFile) requests.delete(oldestWorldFile);
  }
  return promise as Promise<T>;
}

const decoded = new Map<string, Promise<Boundaries>>();
function loadBoundaries(file: string): Promise<Boundaries> {
  let promise = decoded.get(file);
  if (!promise) {
    promise = loadMapData<Topology<{ boundaries: GeometryCollection }>>(file)
      .then(topo => feature(topo, topo.objects.boundaries) as Boundaries)
      .catch(error => { decoded.delete(file); throw error; });
    decoded.set(file, promise);
  }
  return promise;
}
export const loadDepartments = () => loadBoundaries("colombia/departments.json");
export const loadMunicipalities = (department: Boundary) =>
  loadBoundaries(`colombia/${department.properties.file}`);

/** Conservative spherical culling; keep entire neighboring units at the viewport edges. */
export function boundaryVisible(boundary: Boundary, projection: GeoProjection, size: Size) {
  const rotation = projection.rotate();
  const center: [number, number] = [-rotation[0], -rotation[1]];
  const cap = Math.asin(Math.min(1, Math.hypot(size.w / 2 + 30, size.h / 2 + 30) / projection.scale()));
  const [west, south, east, north] = boundary.bbox;
  const reach = Math.max(...[[west, south], [west, north], [east, south], [east, north]].map(p =>
    geoDistance(boundary.properties.center, p as [number, number])));
  if (geoDistance(center, boundary.properties.center) > cap + reach) return false;
  // A second, inexpensive projected bbox check avoids downloading large distant departments.
  const xs: number[] = [];
  const ys: number[] = [];
  for (const lon of [west, (west + east) / 2, east]) {
    for (const lat of [south, (south + north) / 2, north]) {
      const point = projection([lon, lat]);
      if (point) { xs.push(point[0]); ys.push(point[1]); }
    }
  }
  return Math.max(...xs) >= -30 && Math.min(...xs) <= size.w + 30 &&
    Math.max(...ys) >= -30 && Math.min(...ys) <= size.h + 30;
}

export async function localArea(lat: number, lon: number, zoom: number) {
  return worldArea(lat, lon, zoom);
}
