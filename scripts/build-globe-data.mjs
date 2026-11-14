/**
 * Genera public/data/globe.json  (geometrÃ­a estÃ¡tica del globo)
 *
 * Descarga Natural Earth 50m, recorta propiedades y simplifica con mapshaper.
 * Se ejecuta UNA VEZ en el desarrollo; la app no usa ninguna API de mapas.
 *
 * Uso:  npm run globe
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { feature } from "topojson-client";
import { geoArea } from "d3-geo";

const ROOT = path.resolve(process.cwd());
const TMP = path.join(ROOT, "scripts", ".globe-tmp");
const OUT = path.join(ROOT, "public", "data", "globe.json");
const NE = "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/";
const ATLAS = "https://cdn.jsdelivr.net/npm/world-atlas@2/";

const UA = "RotaSmart/1.0 (Space Apps demo)";

fs.mkdirSync(TMP, { recursive: true });

async function download(url, name) {
  const dest = path.join(TMP, name);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) return dest;
  process.stdout.write(`  â†“ ${name} ... `);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  console.log(`${(buf.length / 1024).toFixed(0)} KB`);
  return dest;
}

function trim(src, out, mapper) {
  const gj = JSON.parse(fs.readFileSync(src, "utf8"));
  const features = gj.features.map(mapper).filter(Boolean);
  fs.writeFileSync(out, JSON.stringify({ type: "FeatureCollection", features }));
  console.log(`  ${path.basename(out)}: ${features.length} features`);
  return out;
}

/** Simplifica y reduce la precisiÃ³n decimal para achicar el archivo. */
function simplify(input, output, percent, precision = 5) {
  execFileSync(
    "npx",
    ["-y", "mapshaper", input, "-simplify", `${percent}%`, "keep-shapes",
      "-o", `precision=${precision}`, output],
    { stdio: ["ignore", "ignore", "inherit"], shell: process.platform === "win32", cwd: ROOT },
  );
}

const pick = (p, keys) => {
  for (const k of keys) if (p?.[k] != null) return p[k];
  return null;
};

/**
 * d3-geo usa convenciÃ³n esfÃ©rica: si el anillo va en el sentido equivocado,
 * el polÃ­gono se interpreta como "todo el planeta menos ese interior".
 * Cada fuente (world-atlas vs Natural Earth) viene distinto, asÃ­ que no
 * asumimos ninguna convenciÃ³n: probamos con el centroide de cada polÃ­gono
 * usando geoContains y revertimos los anillos solo cuando no se contiene a sÃ­ mismo.
 */
function ensureWinding(fc) {
  let fixed = 0;
  for (const f of fc.features) {
    const g = f.geometry;
    if (!g) continue;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : null;
    if (!polys) continue;

    for (const poly of polys) {
      // criterion idÃ©ntico al que usa d3-geo para decidir el interior:
      // si el Ã¡rea esfÃ©rica supera media esfera, el anillo estÃ¡ invertido.
      const probe = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: poly } };
      if (geoArea(probe) > Math.PI * 2) {
        for (const ring of poly) ring.reverse();
        fixed += 1;
      }
    }
  }
  return fixed;
}
/**
 * Douglas-Peucker: reduce puntos sin alterar el orden de los anillos
 * (mapshaper reescribe el winding y eso rompe el relleno con d3-geo).
 */
function simplifyRing(points, tol) {
  const n = points.length;
  if (n < 5) return points;
  const sq = tol * tol;
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack = [[0, n - 1]];

  while (stack.length) {
    const [a, b] = stack.pop();
    const [xa, ya] = points[a];
    const [xb, yb] = points[b];
    const dx = xb - xa;
    const dy = yb - ya;
    const len2 = dx * dx + dy * dy;
    let maxD = sq;
    let idx = -1;

    for (let i = a + 1; i < b; i++) {
      const [xp, yp] = points[i];
      let d;
      if (len2 === 0) {
        const ex = xp - xa;
        const ey = yp - ya;
        d = ex * ex + ey * ey;
      } else {
        const t = Math.max(0, Math.min(1, ((xp - xa) * dx + (yp - ya) * dy) / len2));
        const ex = xp - (xa + t * dx);
        const ey = yp - (ya + t * dy);
        d = ex * ex + ey * ey;
      }
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx >= 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function simplifyGeometry(geometry, tol) {
  if (!geometry) return geometry;
  const fix = (ring) => {
    const r = simplifyRing(ring, tol);
    return r.length >= 4 ? r : ring;
  };
  if (geometry.type === "Polygon") {
    geometry.coordinates = geometry.coordinates.map(fix);
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates = geometry.coordinates.map((poly) => poly.map(fix));
  } else if (geometry.type === "LineString") {
    geometry.coordinates = fix(geometry.coordinates);
  } else if (geometry.type === "MultiLineString") {
    geometry.coordinates = geometry.coordinates.map(fix);
  }
  return geometry;
}

function simplifyCollection(fc, tol) {
  let before = 0;
  let after = 0;
  const count = (g) => {
    let n = 0;
    const walk = (c) => {
      if (typeof c[0] === "number") n += 1;
      else c.forEach(walk);
    };
    walk(g.coordinates);
    return n;
  };
  for (const f of fc.features) {
    if (!f.geometry) continue;
    before += count(f.geometry);
    simplifyGeometry(f.geometry, tol);
    after += count(f.geometry);
  }
  return { before, after };
}

const feat = (properties, geometry) => ({ type: "Feature", properties, geometry });

console.log("Descargando fuentes 50mâ€¦");
const countriesRaw = await download(ATLAS + "countries-50m.json", "countries-50m.json");
const adminRaw = await download(NE + "ne_50m_admin_1_states_provinces.geojson", "admin-raw.geojson");
const riversRaw = await download(NE + "ne_50m_rivers_lake_centerlines.geojson", "rivers-raw.geojson");
const lakesRaw = await download(NE + "ne_50m_lakes.geojson", "lakes-raw.geojson");
const citiesRaw = await download(NE + "ne_50m_populated_places.geojson", "cities-raw.geojson");

console.log("Recortando propiedadesâ€¦");
{
  // world-atlas viene en TopoJSON: se convierte a GeoJSON con topojson-client
  const topo = JSON.parse(fs.readFileSync(countriesRaw, "utf8"));
  const key = Object.keys(topo.objects)[0];
  const gj = feature(topo, topo.objects[key]);
  gj.features = gj.features.map((f) => feat({ name: f.properties?.name }, f.geometry));
  fs.writeFileSync(path.join(TMP, "countries.geojson"), JSON.stringify(gj));
  console.log(`  countries.geojson: ${gj.features.length} features`);
}
trim(adminRaw, path.join(TMP, "admin1.geojson"), (f) => {
  const name = pick(f.properties, ["name", "name_en"]);
  return name ? feat({ name }, f.geometry) : null;
});
trim(riversRaw, path.join(TMP, "rivers.geojson"), (f) => feat({}, f.geometry));
trim(lakesRaw, path.join(TMP, "lakes.geojson"), (f) => feat({}, f.geometry));

const citiesTrimmed = path.join(TMP, "cities.geojson");
{
  const gj = JSON.parse(fs.readFileSync(citiesRaw, "utf8"));
  const features = gj.features
    .map((f) => ({
      pop: Number(pick(f.properties, ["pop_max", "POP_MAX", "pop_pop11"])) || 0,
      name: pick(f.properties, ["name", "NAME", "name_en"]),
      geometry: f.geometry,
    }))
    .filter((c) => c.pop >= 150000 && c.name && c.geometry)
    .sort((a, b) => b.pop - a.pop)
    .slice(0, 600)
    .map((c) => feat({ name: c.name, pop: c.pop }, c.geometry));
  fs.writeFileSync(citiesTrimmed, JSON.stringify({ type: "FeatureCollection", features }));
  console.log(`  cities.geojson: ${features.length} features`);
}

console.log("Simplificando geometrÃ­aâ€¦");
simplify(path.join(TMP, "admin1.geojson"), path.join(TMP, "s-admin1.geojson"), 8);
simplify(path.join(TMP, "rivers.geojson"), path.join(TMP, "s-rivers.geojson"), 4);
simplify(path.join(TMP, "lakes.geojson"), path.join(TMP, "s-lakes.geojson"), 4);

const load = (p) => {
  const gj = JSON.parse(fs.readFileSync(p, "utf8"));
  const fc =
    gj.type === "FeatureCollection"
      ? gj
      : gj.type === "GeometryCollection"
        ? { type: "FeatureCollection", features: gj.geometries.map((g) => feat({}, g)) }
        : { type: "FeatureCollection", features: [feat({}, gj)] };
  const fixed = ensureWinding(fc);
  if (fixed) console.log(`  winding corregido en ${path.basename(p)}: ${fixed}`);
  return fc;
};

// PaÃ­ses: se decodifica el TopoJSON (orientaciÃ³n correcta) y se simplifica
// con Douglas-Peucker, que solo elimina puntos.
const countriesGj = JSON.parse(fs.readFileSync(path.join(TMP, "countries.geojson"), "utf8"));
const cStats = simplifyCollection(countriesGj, 0.28);
console.log(`  countries: ${cStats.before} â†’ ${cStats.after} puntos`);

const globe = {
  admin1: load(path.join(TMP, "s-admin1.geojson")),
  rivers: load(path.join(TMP, "s-rivers.geojson")),
  lakes: load(path.join(TMP, "s-lakes.geojson")),
  cities: load(citiesTrimmed),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(globe));

for (const [k, v] of Object.entries(globe)) {
  console.log(`  ${k}: ${v.features.length}`);
}
console.log(`\nglobo listo â†’ public/data/globe.json (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
console.log("  Â¿Huila?", globe.admin1.features.some((f) => /huila/i.test(f.properties.name)));


