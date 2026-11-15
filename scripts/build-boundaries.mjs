/** Static Colombian boundaries, split by department so the globe loads only nearby detail. */
import fs from "node:fs/promises";
import path from "node:path";
import { geoArea, geoBounds, geoCentroid, geoContains } from "d3-geo";
import { createHash } from "node:crypto";
import { topology } from "topojson-server";

const root = process.cwd();
const out = path.join(root, "public/data/colombia");
const tmp = path.join(root, "scripts/.globe-tmp");
await fs.mkdir(out, { recursive: true });
await fs.mkdir(tmp, { recursive: true });

async function download(level) {
  const cache = path.join(tmp, `colombia-${level}.json`);
  try { return JSON.parse(await fs.readFile(cache, "utf8")); } catch { /* first build */ }
  const response = await fetch(`https://www.geoboundaries.org/api/current/gbOpen/COL/${level}/`);
  if (!response.ok) throw new Error(`geoBoundaries ${level}: ${response.status}`);
  const metadata = await response.json();
  const geometry = await fetch(metadata.simplifiedGeometryGeoJSON);
  if (!geometry.ok) throw new Error(`Geometry ${level}: ${geometry.status}`);
  const result = { metadata, collection: await geometry.json() };
  await fs.writeFile(cache, JSON.stringify(result));
  return result;
}

function normalize(feature) {
  const geometry = feature.geometry;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  for (const coordinates of polygons) {
    // d3's spherical winding is opposite to RFC 7946.
    if (geoArea({ type: "Polygon", coordinates }) > 2 * Math.PI) {
      for (const ring of coordinates) ring.reverse();
    }
    for (const ring of coordinates) {
      for (const point of ring) {
        point[0] = +point[0].toFixed(5);
        point[1] = +point[1].toFixed(5);
      }
    }
  }
  const [[west, south], [east, north]] = geoBounds(feature);
  return {
    type: "Feature",
    properties: { id: feature.properties.shapeID, name: feature.properties.shapeName,
      center: geoCentroid(feature).map(v => +v.toFixed(5)) },
    bbox: [west, south, east, north].map(v => +v.toFixed(5)),
    geometry,
  };
}

const [adm1, adm2] = await Promise.all([download("ADM1"), download("ADM2")]);
const departments = adm1.collection.features.map(normalize);
const groups = new Map(departments.map(d => [d.properties.id, []]));
for (const raw of adm2.collection.features) {
  const municipality = normalize(raw);
  let department = departments.find(d => geoContains(d, municipality.properties.center));
  // A centroid of an irregular/coastal unit may lie outside its parent. Test its vertices.
  if (!department) {
    const g = municipality.geometry;
    const ring = g.type === "Polygon" ? g.coordinates[0] : g.coordinates[0][0];
    department = departments.find(d => ring.some(p => geoContains(d, p)));
  }
  if (!department) throw new Error(`No parent department: ${municipality.properties.name}`);
  groups.get(department.properties.id).push(municipality);
}

let bytes = 0;
for (const department of departments) {
  const collection = { type: "FeatureCollection", features: groups.get(department.properties.id) };
  const content = JSON.stringify(topology({ boundaries: collection }, 100000));
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 10);
  const file = `${department.properties.id}-${hash}.json`;
  department.properties.file = file;
  await fs.writeFile(path.join(out, file), content);
  bytes += Buffer.byteLength(content);
}
await fs.writeFile(path.join(out, "departments.json"), JSON.stringify({
  ...topology({ boundaries: { type: "FeatureCollection", features: departments } }, 100000),
  source: "geoBoundaries gbOpen", license: "CC BY 4.0",
  boundaryIDs: [adm1.metadata.boundaryID, adm2.metadata.boundaryID],
  sources: [adm1.metadata.boundarySource, adm2.metadata.boundarySource],
}));
console.log(`${departments.length} departments, ${adm2.collection.features.length} municipalities, ${(bytes / 1024).toFixed(0)} KB split across departments.`);
