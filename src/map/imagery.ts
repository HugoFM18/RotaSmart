/** The same real imagery and fallbacks are used in both projections. */
export const IMAGERY_PROVIDERS = [
  { id: "esri", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 19, attribution: "Imágenes © Esri · Maxar · Earthstar Geographics" },
  { id: "eox", url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg",
    maxZoom: 14, attribution: '<a href="https://s2maps.eu/">Sentinel-2 cloudless © EOX</a> (CC BY 4.0)' },
  { id: "nasa", url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/2020-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg",
    maxZoom: 8, attribution: "NASA GIBS · Blue Marble" },
  { id: "osm", url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' },
] as const;
export const BOUNDARY_ATTRIBUTION = '<a href="https://www.geoboundaries.org/globalDownloads.html">geoBoundaries CGAZ</a> · CC BY 4.0';
