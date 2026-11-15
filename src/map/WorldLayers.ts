import type { Map as MapLibreMap, FilterSpecification } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { countriesInView, loadWorldBoundaries, loadWorldIndex } from "./world";
import type { WorldIndex } from "./world";
import type { Boundary } from "./boundaries";

export type BoundaryStatus = "loading" | "ready" | "error";

/** Load geographic detail after movement settles; the imagery remains interactive during downloads. */
export class WorldLayers {
  private index: WorldIndex | null = null;
  private active = new Set<string>();
  private generation = 0;
  private timer = 0;
  private disposed = false;
  private listening = false;
  constructor(private map: MapLibreMap, private status: (value: BoundaryStatus) => void) {}

  async start() {
    try {
      this.status("loading");
      this.index = await loadWorldIndex();
      if (this.disposed) return;
      if (!this.map.getSource("world-countries")) {
        this.map.addSource("world-countries", { type: "geojson", data: { type: "FeatureCollection", features: this.index.countries }, tolerance: 0.5 });
        this.addLines("world-countries", "world-countries", "#FFFFFF", 1.4, 0);
        this.addLabels("world-countries", this.index.countries, 1.5, 5.5, 12);
      }
      if (!this.listening) { this.map.on("moveend", this.schedule); this.listening = true; }
      this.status("ready");
      this.schedule();
    } catch { if (!this.disposed) this.status("error"); }
  }

  private addLines(id: string, source: string, color: string, width: number, minzoom: number) {
    const before = this.map.getLayer("selected-fill") ? "selected-fill" : undefined;
    this.map.addLayer({ id: `${id}-halo`, type: "line", source, minzoom,
      paint: { "line-color": "#07131C", "line-opacity": 0.65, "line-width": width + 1.5 } }, before);
    this.map.addLayer({ id: `${id}-line`, type: "line", source, minzoom,
      paint: { "line-color": color, "line-opacity": 0.9, "line-width": width } }, before);
  }

  private addLabels(id: string, features: Boundary[], minzoom: number, maxzoom: number, size: number) {
    const source = `${id}-names`;
    // One anchor per unit avoids repeating the same polygon name in every tile.
    this.map.addSource(source, { type: "geojson", data: { type: "FeatureCollection", features: features.map(item => ({
      type: "Feature", properties: { name: item.properties.name }, geometry: { type: "Point", coordinates: item.properties.center },
    })) } });
    this.map.addLayer({ id: `${id}-labels`, type: "symbol", source, minzoom, maxzoom,
      layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": size,
        "text-max-width": 10, "text-padding": 12, "text-allow-overlap": false },
      paint: { "text-color": "#FFFFFF", "text-halo-color": "#12202B", "text-halo-width": 1.8 } },
    this.map.getLayer("selected-fill") ? "selected-fill" : undefined);
  }

  private remove(id: string) {
    for (const suffix of ["labels", "line", "halo"]) if (this.map.getLayer(`${id}-${suffix}`)) this.map.removeLayer(`${id}-${suffix}`);
    if (this.map.getSource(`${id}-names`)) this.map.removeSource(`${id}-names`);
    if (this.map.getSource(id)) this.map.removeSource(id);
    this.active.delete(id);
  }

  private fineBoundaries(zoom: number) {
    const id = "world-local";
    if (zoom < 9) { this.remove(id); return; }
    if (this.map.getSource(id)) return;
    // Native vector tiles add county/municipal/ward detail (OSM levels 5–10)
    // without transferring a country's full high-resolution geometry.
    this.map.addSource(id, { type: "vector", url: "https://tiles.openfreemap.org/planet", minzoom: 9,
      attribution: '<a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' });
    const before = this.map.getLayer("selected-fill") ? "selected-fill" : undefined;
    const filter: FilterSpecification = ["all", [">=", ["get", "admin_level"], 5], ["!=", ["get", "maritime"], 1]];
    this.map.addLayer({ id: `${id}-halo`, type: "line", source: id, "source-layer": "boundary", minzoom: 9, filter,
      paint: { "line-color": "#07131C", "line-opacity": 0.7, "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.8, 15, 3] } }, before);
    this.map.addLayer({ id: `${id}-line`, type: "line", source: id, "source-layer": "boundary", minzoom: 9, filter,
      paint: { "line-color": "#D0F4FF", "line-opacity": 0.95, "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.6, 15, 1.3] } }, before);
    this.map.addLayer({ id: `${id}-labels`, type: "symbol", source: id, "source-layer": "place", minzoom: 9,
      filter: ["match", ["get", "class"], ["city", "town", "village", "suburb", "quarter"], true, false],
      layout: { "text-field": ["coalesce", ["get", "name:latin"], ["get", "name_en"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"], "text-size": 11, "text-max-width": 9, "text-padding": 10 },
      paint: { "text-color": "#FFFFFF", "text-halo-color": "#12202B", "text-halo-width": 1.8 } }, before);
  }

  schedule = () => {
    window.clearTimeout(this.timer);
    ++this.generation;
    this.timer = window.setTimeout(() => { void this.refresh(); }, 350);
  };

  async refresh() {
    if (!this.index || this.disposed) return;
    if (this.map.isMoving()) { this.schedule(); return; }
    const generation = ++this.generation;
    const zoom = this.map.getZoom();
    this.fineBoundaries(zoom);
    const bounds = this.map.getBounds();
    const center = this.map.getCenter();
    const countries = zoom < 3.5 ? [] : countriesInView(this.index, {
      west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth(),
    }, [center.lng, center.lat], zoom >= 7 ? 8 : 12);
    const wanted = countries.flatMap(country => (zoom >= 7 ? [1, 2] as const : [1] as const)
      .filter(level => country.properties.levels[level])
      .map(level => ({ country, level, id: `world-${country.properties.id}-${level}` })));
    const wantedIds = new Set(wanted.map(item => item.id));
    for (const id of this.active) if (!wantedIds.has(id)) this.remove(id);
    const missing = wanted.filter(item => !this.active.has(item.id));
    if (!missing.length) { this.status("ready"); return; }
    this.status("loading");
    const results = await Promise.allSettled(missing.map(async item => ({ ...item,
      data: await loadWorldBoundaries(item.country, item.level),
    })));
    if (this.disposed || generation !== this.generation) return;
    let failed = false;
    for (const result of results) {
      if (result.status === "rejected") { failed = true; continue; }
      const { id, level, data } = result.value;
      if (this.map.getSource(id)) continue;
      this.map.addSource(id, { type: "geojson", data: data as FeatureCollection, tolerance: 0.4, maxzoom: 14 });
      this.addLines(id, id, level === 1 ? "#FFE3A0" : "#BAF1FF", level === 1 ? 1.15 : 0.7, level === 1 ? 3.5 : 7);
      this.addLabels(id, data.features, level === 1 ? 4.5 : 7.5, level === 1 ? 8 : 11, level === 1 ? 11 : 10);
      this.active.add(id);
    }
    this.status(failed ? "error" : "ready");
  }

  retry() {
    this.remove("world-local");
    if (this.listening) this.schedule();
    else void this.start();
  }

  dispose() {
    this.disposed = true;
    ++this.generation;
    window.clearTimeout(this.timer);
    this.map.off("moveend", this.schedule);
  }
}
