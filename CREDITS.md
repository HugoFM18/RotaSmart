# Créditos y atribuciones — RotaSmart

RotaSmart es un proyecto independiente desarrollado para el **NASA Space Apps
Challenge 2026**, reto *"Cambio de rumbo: Adaptando las granjas con datos de la NASA"*.

> **Aviso de marca:** este proyecto **no utiliza logos, banderas ni identificadores de
> misión de la NASA**. No está afiliado ni respaldado por la NASA. Los datos se atribuyen
> por texto, conforme a las reglas del evento.

---

## 1. Datos de la NASA

| Fuente | Uso en el proyecto | Enlace |
|---|---|---|
| **NASA POWER** | Series mensuales 2005–2024 consultadas en vivo para cualquier coordenada del planeta. | <https://power.larc.nasa.gov/> |

> Los datasets SMAP, GPM-IMERG, MODIS y SRTM se evaluaron durante el desarrollo como
> fuentes del reto, pero la versión actual obtiene todas las variables agroclimáticas de
> NASA POWER para mantener una sola fuente consistente y verificable por coordenada.

**Documentación de la API POWER:** <https://power.larc.nasa.gov/docs/services/api/>

Los datos de NASA son de dominio público y se ofrecen sin garantía. RotaSmart los agrega
y transforma; las cifras mostradas son derivadas y no deben citarse como observaciones
oficiales.

## 2. Otras fuentes de datos

| Fuente | Uso | Licencia | Enlace |
|---|---|---|---|
| **SoilGrids (ISRIC)** | Propiedades del suelo (arcilla, arena, materia orgánica, pH, CIC). | CC BY 4.0 | <https://soilgrids.org/> |
| **Nominatim / OpenStreetMap** | Búsqueda de lugares. | ODbL | <https://nominatim.org/> |
| **BigDataCloud** | Geocodificación inversa. | Términos del servicio | <https://www.bigdatacloud.com/> |
| **geoBoundaries CGAZ** | Límites mundiales ADM0–2: 3.224 unidades ADM1 y 49.349 ADM2, simplificadas y distribuidas por país. Fuente, fecha de generación y SHA-256 en `public/data/world/index.json`. | CC BY 4.0 | <https://www.geoboundaries.org/globalDownloads.html> |
| **OpenStreetMap / OpenFreeMap / OpenMapTiles** | Teselas vectoriales de límites locales (niveles administrativos 5–10) y nombres al acercarse, en 3D y 2D. OpenStreetMap raster es el último respaldo de imágenes. | ODbL (datos OSM) | <https://openfreemap.org/> · <https://openmaptiles.org/> · <https://www.openstreetmap.org/copyright> |
| **Esri World Imagery** | Imágenes satelitales a color del globo y del plano; atribución visible de Esri, Maxar y Earthstar Geographics. | Términos de Esri y proveedores | <https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9> |
| **EOX Sentinel-2 cloudless** | Respaldo de imágenes globales. | CC BY 4.0 | <https://s2maps.eu/> |
| **NASA GIBS Blue Marble** | Respaldo de imágenes globales de menor resolución. | Datos NASA de acceso público | <https://www.earthdata.nasa.gov/data/tools/gibs> |
| **Natural Earth (world-atlas)** | Geometrías históricas de referencia conservadas en el repositorio. | Dominio público | <https://www.naturalearthdata.com/> |
| **FAO-56** | Referencia metodológica para evapotranspiración y coeficientes de cultivo. | Documento público | <https://www.fao.org/3/x0490s/x0490s00.htm> |

**Nota metodológica:** las propiedades del suelo se consultan a **SoilGrids (ISRIC)** para
cada punto. Cuando el servicio no devuelve datos para una coordenada (ocurre en algunas
zonas de Sudamérica), se estiman a partir del clima de NASA POWER mediante un modelo
pedológico simple, y la interfaz lo indica como *"Suelo: estimado"*.

## 3. Software y librerías

| Componente | Licencia | Enlace |
|---|---|---|
| React | MIT | <https://react.dev/> |
| Vite | MIT | <https://vite.dev/> |
| TypeScript | Apache-2.0 | <https://www.typescriptlang.org/> |
| d3-geo | ISC | <https://d3js.org/d3-geo> |
| MapLibre GL JS | BSD-3-Clause | <https://maplibre.org/> |
| topojson-client | ISC | <https://github.com/topojson/topojson-client> |
| topojson-server | ISC | <https://github.com/topojson/topojson-server> |
| topojson-simplify | ISC | <https://github.com/topojson/topojson-simplify> |
| stream-json | BSD-3-Clause | <https://github.com/uhop/stream-json> |
| Leaflet | BSD-2-Clause | <https://leafletjs.com/> |
| Tailwind CSS | MIT | <https://tailwindcss.com/> |
| Zustand | MIT | <https://zustand-demo.pmnd.rs/> |
| TanStack Query | MIT | <https://tanstack.com/query> |
| i18next / react-i18next | MIT | <https://www.i18next.com/> |
| lucide-react | ISC | <https://lucide.dev/> |
| vite-plugin-pwa / Workbox | MIT | <https://vite-pwa-org.netlify.app/> |
| Vitest | MIT | <https://vitest.dev/> |
| mapshaper | MPL-2.0 | <https://mapshaper.org/> |

## 4. Tipografía

| Fuente | Licencia | Enlace |
|---|---|---|
| Fraunces | SIL Open Font License 1.1 | <https://fonts.google.com/specimen/Fraunces> |
| Inter | SIL Open Font License 1.1 | <https://fonts.google.com/specimen/Inter> |
| Noto Sans (etiquetas del mapa, glifos MapLibre) | SIL Open Font License 1.1 | <https://fonts.google.com/noto/specimen/Noto+Sans> |

## 5. Metodología

- **Evapotranspiración de referencia:** ecuación de Hargreaves, a partir de temperatura
  máxima, mínima y radiación extraterrestre calculada por latitud (FAO-56).
- **Tendencias:** regresión lineal sobre series anuales 2005–2024, expresadas por década.
- **Escenarios:** ajuste proporcional de precipitación y temperatura sobre el motor de
  evaluación de rotaciones.
- **Motor de rotaciones:** reglas agronómicas deterministas, sin aprendizaje automático.
  Los pesos de cada indicador provienen de las prioridades del usuario.

## 6. Uso de inteligencia artificial

Se utilizaron herramientas de asistencia de IA para la generación y revisión de código y
para la redacción de documentación. **No se generaron imágenes con IA** y ningún contenido
incluye marcas, logos o identificadores de la NASA. Esta declaración se registra también en
el formulario oficial del evento.

## 7. Equipo

Proyecto desarrollado en el marco del NASA Space Apps Challenge 2026.

---

Si encuentras un error de atribución o una licencia mal citada, abre un issue en el
repositorio.
