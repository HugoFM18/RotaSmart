import L from "leaflet";
import type { FeatureCollection } from "geojson";
import { BOUNDARY_ATTRIBUTION } from "./imagery";
import { boundsOverlap, countriesInView, loadWorldBoundaries, loadWorldIndex } from "./world";
import type { WorldIndex } from "./world";

/** Shared worldwide data, rendered on Canvas in 2D and filtered to the viewport. */
export class WorldFlatLayers {
  private index: WorldIndex | null = null;
  private timer = 0;
  private generation = 0;
  private disposed = false;
  private countries: L.GeoJSON | null = null;
  private details: L.GeoJSON;
  constructor(private map: L.Map) {
    const renderer = L.canvas({ padding: 0.25, pane: "world-boundaries" });
    this.details = L.geoJSON(undefined, { pane: "world-boundaries", style: feature => ({
      renderer, color: feature?.properties.level === 1 ? "#FFE3A0" : "#BAF1FF",
      weight: feature?.properties.level === 1 ? 1.6 : 0.9, opacity: 0.95, fill: false,
    }), onEachFeature: (feature, layer) => {
      const label = document.createElement("span");
      label.textContent = feature.properties.name;
      layer.bindTooltip(label, { sticky: true });
    } }).addTo(map);
  }

  async start() {
    try {
      this.index = await loadWorldIndex();
      if (this.disposed) return;
      this.map.attributionControl.addAttribution(BOUNDARY_ATTRIBUTION);
      this.countries = L.geoJSON({ type: "FeatureCollection", features: this.index.countries } as FeatureCollection, {
        pane: "world-boundaries", interactive: false,
        style: { renderer: L.canvas({ pane: "world-boundaries" }), color: "#FFFFFF", weight: 1.2, opacity: 0.85, fill: false },
      }).addTo(this.map);
      this.map.on("moveend", this.schedule);
      this.schedule();
    } catch { /* The imagery and selection still work if an outline download is unavailable. */ }
  }

  schedule = () => {
    window.clearTimeout(this.timer);
    ++this.generation;
    this.timer = window.setTimeout(() => { void this.refresh(); }, 350);
  };

  private async refresh() {
    if (!this.index || this.disposed) return;
    const generation = ++this.generation;
    const bounds = this.map.getBounds();
    const center = this.map.getCenter();
    const view = { west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth() };
    const zoom = this.map.getZoom();
    const countries = zoom < 4 ? [] : countriesInView(this.index, view, [center.lng, center.lat], zoom >= 7 ? 8 : 12);
    const requests = countries.flatMap(country => (zoom >= 7 ? [1, 2] as const : [1] as const)
      .map(level => loadWorldBoundaries(country, level)));
    const results = await Promise.allSettled(requests);
    if (this.disposed || generation !== this.generation) return;
    const features = results.flatMap(result => result.status === "fulfilled" ? result.value.features.filter(item => boundsOverlap(item.bbox, view)) : []);
    this.details.clearLayers();
    this.details.addData({ type: "FeatureCollection", features } as FeatureCollection);
  }

  dispose() {
    this.disposed = true;
    ++this.generation;
    window.clearTimeout(this.timer);
    this.map.off("moveend", this.schedule);
    this.countries?.remove();
    this.details.remove();
  }
}
