/** Build worldwide ADM0/1/2 from geoBoundaries CGAZ without loading the raw world into memory. */
import fs from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import path from "node:path";
import { once } from "node:events";
import { createHash } from "node:crypto";
import StreamJson from "stream-json";
import Pick from "stream-json/filters/Pick.js";
import StreamArray from "stream-json/streamers/StreamArray.js";
import { topology } from "topojson-server";
import { feature, merge, quantize } from "topojson-client";
import { presimplify, simplify } from "topojson-simplify";
import { geoArea, geoBounds, geoCentroid } from "d3-geo";

const cache = path.resolve("scripts/.globe-tmp/world");
const spool = path.join(cache, "spool");
const output = path.resolve("public/data/world");
await fs.mkdir(spool, { recursive: true });
await fs.mkdir(output, { recursive: true });
const collection = features => ({ type: "FeatureCollection", features });
const sourceBase = "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/CGAZ/";

async function countryNames() {
  const file = path.join(cache, "names.json");
  let metadata;
  try { metadata = JSON.parse(await fs.readFile(file, "utf8")); }
  catch {
    const response = await fetch("https://www.geoboundaries.org/api/current/gbOpen/ALL/ADM0/");
    if (!response.ok) throw new Error(`Country metadata: ${response.status}`);
    metadata = await response.json();
    await fs.writeFile(file, JSON.stringify(metadata));
  }
  return new Map(metadata.map(item => [item.boundaryISO, item.boundaryName]));
}

function roundCoordinates(coordinates) {
  if (typeof coordinates[0] === "number") {
    coordinates[0] = +coordinates[0].toFixed(5);
    coordinates[1] = +coordinates[1].toFixed(5);
  } else coordinates.forEach(roundCoordinates);
}

async function split(level) {
  const rawFile = path.join(cache, `geoBoundariesCGAZ_ADM${level}.geojson`);
  const stat = await fs.stat(rawFile);
  const manifestFile = path.join(spool, `level-${level}.json`);
  try {
    const previous = JSON.parse(await fs.readFile(manifestFile, "utf8"));
    if (previous.sourceSize === stat.size && previous.sourceMtime === stat.mtimeMs) return previous;
  } catch { /* first build */ }
  const streams = new Map();
  const counts = {};
  const hash = createHash("sha256");
  const input = createReadStream(rawFile);
  input.on("data", chunk => hash.update(chunk));
  const features = input.pipe(StreamJson.parser()).pipe(Pick.pick({ filter: "features" })).pipe(StreamArray.streamArray());
  let count = 0;
  for await (const { value } of features) {
    const iso = value.properties?.shapeGroup;
    if (!/^[A-Z0-9]{3}$/.test(iso ?? "")) throw new Error(`Invalid country identifier: ${iso}`);
    if (!value.geometry || !["Polygon", "MultiPolygon"].includes(value.geometry.type)) continue;
    roundCoordinates(value.geometry.coordinates);
    const properties = value.properties;
    value.properties = { id: `${iso}-${level}-${properties.shapeID}`, name: properties.shapeName || iso,
      country: iso, level, sourceLevel: Number(properties.shapeType?.replace("ADM", "")) || level };
    let stream = streams.get(iso);
    if (!stream) {
      stream = createWriteStream(path.join(spool, `${iso}-${level}.ndjson`));
      streams.set(iso, stream);
    }
    if (!stream.write(JSON.stringify(value) + "\n")) await once(stream, "drain");
    counts[iso] = (counts[iso] || 0) + 1;
    count++;
    if (count % 5000 === 0) console.log(`ADM${level}: split ${count} units`);
  }
  await Promise.all([...streams.values()].map(stream => new Promise((resolve, reject) => {
    stream.on("error", reject); stream.end(resolve);
  })));
  const result = { counts, total: count, sourceSize: stat.size, sourceMtime: stat.mtimeMs, sha256: hash.digest("hex") };
  await fs.writeFile(manifestFile, JSON.stringify(result));
  return result;
}

/** Shared arcs keep adjacent borders identical. Protect three vertices in closed island rings. */
function simplifyTopology(input, tolerance) {
  const weighted = presimplify(input);
  for (const geometry of weighted.objects.boundaries.geometries) {
    const polygons = geometry.type === "Polygon" ? [geometry.arcs] : geometry.type === "MultiPolygon" ? geometry.arcs : [];
    for (const polygon of polygons) for (const ring of polygon) {
      if (ring.length > 2) continue; // arc endpoints already preserve a polygon with three or more arcs
      const points = ring.flatMap(index => {
        const arc = weighted.arcs[index < 0 ? ~index : index];
        return index < 0 ? [...arc].reverse() : arc;
      });
      for (const fraction of [0, 1 / 3, 2 / 3]) {
        const point = points[Math.floor((points.length - 1) * fraction)];
        if (point) point[2] = Infinity;
      }
    }
  }
  return quantize(simplify(weighted, tolerance), 1000000);
}

function geographicMetadata(item) {
  const geometry = item.geometry;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  for (const coordinates of polygons) {
    if (geoArea({ type: "Polygon", coordinates }) > 2 * Math.PI) coordinates.forEach(ring => ring.reverse());
  }
  const [[west, south], [east, north]] = geoBounds(item);
  item.bbox = [west, south, east, north].map(value => +value.toFixed(5));
  const center = geoCentroid(item);
  item.properties.center = center.map(value => +value.toFixed(5));
  if (![...item.bbox, ...item.properties.center].every(Number.isFinite)) throw new Error(`Invalid geometry: ${item.properties.id}`);
  return item;
}

const names = await countryNames();
names.set("ATA", "Antarctica");
const manifests = {};
const countries = new Map();
let bytes = 0;
for (const level of [1, 2]) {
  const manifest = await split(level);
  manifests[level] = manifest;
  for (const iso of Object.keys(manifest.counts).sort()) {
    const raw = await fs.readFile(path.join(spool, `${iso}-${level}.ndjson`), "utf8");
    const units = raw.trim().split("\n").map(line => JSON.parse(line));
    const topo = simplifyTopology(topology({ boundaries: collection(units) }), level === 1 ? 0.00005 : 0.000005);
    const decoded = feature(topo, topo.objects.boundaries);
    decoded.features.forEach((unit, index) => {
      geographicMetadata(unit);
      topo.objects.boundaries.geometries[index].properties = unit.properties;
      topo.objects.boundaries.geometries[index].bbox = unit.bbox;
    });
    const content = JSON.stringify(topo);
    const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);
    const file = `${iso}-ADM${level}-${hash}.json`;
    await fs.writeFile(path.join(output, file), content);
    bytes += Buffer.byteLength(content);
    let country = countries.get(iso);
    if (!country) {
      const geometry = merge(topo, topo.objects.boundaries.geometries);
      country = { type: "Feature", properties: { id: iso, name: names.get(iso) || (units.length === 1 ? units[0].properties.name : iso), country: iso,
        level: 0, levels: {}, counts: {} }, geometry };
      countries.set(iso, country);
    }
    country.properties.levels[level] = file;
    country.properties.counts[level] = units.length;
    // Some countries retain outlying islands only at ADM2; include every child extent.
    const corners = ([w, s, e, n]) => [[w, s], [e, n]];
    country.bbox = geoBounds({ type: "MultiPoint", coordinates: [...(country.bbox ? corners(country.bbox) : []), ...corners(geoBounds(decoded).flat())] }).flat();
    console.log(`${iso} ADM${level}: ${units.length} units, ${(Buffer.byteLength(content) / 1024).toFixed(0)} KB`);
  }
}

const overview = simplifyTopology(topology({ boundaries: collection([...countries.values()]) }), 0.003);
feature(overview, overview.objects.boundaries).features.forEach((country, index) => {
  geographicMetadata(country);
  overview.objects.boundaries.geometries[index].properties = country.properties;
  overview.objects.boundaries.geometries[index].bbox = countries.get(country.properties.id).bbox ?? country.bbox;
});
overview.source = { name: "geoBoundaries CGAZ", url: "https://www.geoboundaries.org/globalDownloads.html",
  license: "CC BY 4.0", generatedAt: new Date().toISOString(),
  levels: Object.fromEntries(Object.entries(manifests).map(([level, value]) => [level, {
    url: `${sourceBase}geoBoundariesCGAZ_ADM${level}.geojson`, sha256: value.sha256, units: value.total,
  }])) };
await fs.writeFile(path.join(output, "index.json"), JSON.stringify(overview));
console.log(`World complete: ${countries.size} countries/territories, ${manifests[1].total} ADM1, ${manifests[2].total} ADM2, ${(bytes / 1048576).toFixed(1)} MB split by country.`);
