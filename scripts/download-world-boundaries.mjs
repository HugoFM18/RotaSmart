import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";

const directory = path.resolve("scripts/.globe-tmp/world");
await fs.mkdir(directory, { recursive: true });
for (const level of [1, 2]) {
  const name = `geoBoundariesCGAZ_ADM${level}.geojson`;
  const destination = path.join(directory, name);
  let exists = false;
  try { exists = (await fs.stat(destination)).size > 1000; } catch { /* initial build */ }
  if (!exists) {
    const url = `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/CGAZ/${name}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(1200000) });
    if (!response.ok) throw new Error(`${response.status}: ${url}`);
    console.log(`ADM${level}: downloading ${response.headers.get("content-length") ?? "unknown"} bytes`);
    let bytes = 0;
    let last = Date.now();
    const progress = new Transform({ transform(chunk, _, done) {
      bytes += chunk.length;
      if (Date.now() - last > 5000) { console.log(`ADM${level}: ${(bytes / 1048576).toFixed(1)} MB`); last = Date.now(); }
      done(null, chunk);
    }});
    await pipeline(Readable.fromWeb(response.body), progress, createWriteStream(destination + ".part"));
    await fs.rename(destination + ".part", destination);
    console.log(`ADM${level}: saved ${(bytes / 1048576).toFixed(1)} MB`);
  }
  const handle = await fs.open(destination);
  const buffer = Buffer.alloc(65536);
  const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
  await handle.close();
  const preview = buffer.subarray(0, bytesRead).toString("utf8");
  console.log(`ADM${level} properties:`, [...preview.matchAll(/"properties"\s*:\s*(\{[^}]*\})/g)].map(match => match[1]).filter(value => /shapeGroup|shapeName/.test(value)).slice(0, 2));
}
