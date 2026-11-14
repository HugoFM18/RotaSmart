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
| **NASA GIBS** | Tiles WMTS: Blue Marble (globo) y capas NDVI, precipitación y temperatura. | <https://nasa.github.io/nasa-gibs/> |
| **NASA SMAP** | Humedad del suelo (visualización vía GIBS L4). | <https://smap.jpl.nasa.gov/> |
| **NASA GPM / IMERG** | Precipitación global (visualización vía GIBS). | <https://gpm.nasa.gov/> |
| **NASA MODIS** | Índices de vegetación y temperatura de superficie (vía GIBS). | <https://modis.gsfc.nasa.gov/> |

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
| **geoBoundaries** | Límites administrativos (datos regionales opcionales). | CC BY 4.0 | <https://www.geoboundaries.org/> |
| **OpenStreetMap / CARTO** | Mapa base de referencia. | ODbL / atribución CARTO | <https://www.openstreetmap.org/copyright> |
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
| MapLibre GL JS | BSD-3-Clause | <https://maplibre.org/> |
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
