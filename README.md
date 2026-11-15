# RotaSmart

**Viabilidad de cultivos en cualquier punto del mundo, con datos de la NASA.**

> Reto: **"Cambio de rumbo: Adaptando las granjas con datos de la NASA"**
> *(Field Shift: Adapting Farms with NASA Data — NASA Space Apps Challenge 2026)*

**Demo en vivo:** <https://rotasmart-zeta.vercel.app/>

---

## 1. Contexto

Un agricultor sabe qué cultiva, pero no siempre sabe si ese cultivo es sostenible en su
suelo y su clima. RotaSmart responde esa pregunta en segundos: **haz clic en tu parcela
del globo, elige tu cultivo y obtén su viabilidad** junto con los datos que la explican.

---

## 2. Qué hace

1. **Explora el globo terráqueo** con imágenes satelitales a color y hace clic en cualquier
   punto del planeta, o busca un lugar por nombre.
2. **Indica el cultivo actual** entre diez opciones (maíz, fríjol, café, cacao, arroz…).
3. **Consulta en vivo** 20 años de datos de NASA POWER y las propiedades del suelo.
4. **Devuelve un índice de viabilidad 0–100** con veredicto y cuatro factores: agua,
   temperatura, suelo y riesgo.
5. **Señala los factores limitantes**: déficit hídrico, pH inadecuado, heladas, textura.
6. **Muestra los datos del sitio**: temperatura máxima y mínima, lluvia anual,
   evapotranspiración, índice de aridez, tendencias 2005–2024, riesgos y suelo.
7. **Recomienda rotaciones** que mejorarían la situación del lote.

---

## 3. Características

- **Globo 3D satelital con MapLibre GL JS**: imágenes Esri World Imagery a color, arrastre, zoom, gestos táctiles y selección de áreas.
- **Mapa 2D satelital** con los mismos límites, imágenes y selección. Cambiar de proyección conserva el renderizador y su caché. Leaflet sirve como respaldo si WebGL2 no está disponible.
- **Respaldo de imágenes**: Esri → EOX Sentinel-2 → NASA Blue Marble → OpenStreetMap.
- **Zoom al hacer clic**: cada clic centra y acerca a la zona seleccionada.
- **Delimitación automática de la zona**: al hacer clic o buscar, se dibuja el límite administrativo en amarillo suave y el mapa se ajusta a él. En el globo se selecciona el departamento en la vista regional y el municipio al acercarse.
- **Límites globales**: catálogo de geoBoundaries CGAZ con 3.224 subdivisiones ADM1 y 49.349 ADM2, incluidos los vecinos de la zona visible. Los niveles equivalen a departamentos/estados y municipios/distritos según el país. Al acercarse se añaden límites locales de OpenStreetMap (niveles administrativos 5–10) mediante OpenFreeMap. La cobertura y actualización dependen de cada fuente.
- **Carga progresiva**: las imágenes aparecen antes del detalle administrativo. El catálogo global se descarga una vez y las geometrías TopoJSON por país solo al acercarse. Los límites locales usan teselas vectoriales, procesadas en workers; las cargas se agrupan al terminar de mover el mapa y las cachés tienen límites de memoria.
- **Delimitación del municipio** en amarillo suave al buscarlo, con encuadre automático.
- **Análisis bajo demanda** en cualquier coordenada del planeta.
- **Buscador de lugares** con geocodificación inversa y directa.
- **Viabilidad del cultivo** explicada en cuatro factores y factores limitantes.
- **Datos agroclimáticos completos**: máximas, mínimas, lluvia, ET0, aridez y tendencias.
- **Suelo real de SoilGrids** cuando está disponible, con estimación por clima como respaldo.
- **Rotaciones recomendadas** ajustables por prioridades del agricultor.
- **Escenario climático** interactivo: lluvia ±30 % y temperatura −1 a +3 °C.
- **Bilingüe** español / inglés con un solo botón.
- **PWA**: funciona sin conexión tras la primera visita.
- **Sin registro, sin contraseña, sin instalación.**

---

## 4. APIs y datos de la NASA

| Servicio | Qué entrega | Uso en RotaSmart | Clave |
|---|---|---|---|
| **NASA POWER** | Temperatura, precipitación, humedad, viento y radiación, series mensuales 2005–2024 para cualquier coordenada. | Base del balance hídrico, ET0, tendencias y riesgos. | ✅ No |

> Los mapas base usan imágenes Esri, con EOX/NASA GIBS/OpenStreetMap como respaldo.
> Los datos agroclimáticos de NASA provienen de POWER, consultado en vivo por coordenada.

```text
NASA POWER (mensual, punto):
https://power.larc.nasa.gov/api/temporal/monthly/point
  ?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN
  &community=AG&longitude=-75.28&latitude=2.93
  &start=2005&end=2024&format=JSON

NASA GIBS (Blue Marble):
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/
  BlueMarble_ShadedRelief_Bathymetry/default/2020-01-01/
  GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg
```

### Otras fuentes

| Fuente | Uso |
|---|---|
| **SoilGrids (ISRIC)** | Arcilla, arena, materia orgánica, pH y CIC a 250 m |
| **Nominatim / OpenStreetMap** | Búsqueda de lugares |
| **BigDataCloud** | Geocodificación inversa |
| **FAO-56** | Metodología de evapotranspiración (Hargreaves) |

> Si SoilGrids no cubre un punto, el suelo se estima a partir del clima de NASA POWER y
> la interfaz lo indica como *"Suelo: estimado"*.

---

## 5. Cómo funciona

```text
Clic en el globo (lat, lon)
        │
        ▼
┌─────────────────────────────────────────┐
│ NASA POWER  ──► temperatura, lluvia     │
│ SoilGrids   ──► textura, pH, MO, CIC    │
│ Geocodificador ──► nombre del lugar     │
└─────────────────────────────────────────┘
        │
        ▼
Motor determinista: agua · temperatura · suelo · riesgo
        │
        ▼
Viabilidad 0–100 + limitantes + rotaciones recomendadas
```

No hay backend ni base de datos: el navegador consulta las APIs públicas (CORS abierto)
y calcula todo en el cliente en pocos milisegundos.

---

## 6. Tecnologías

### Lenguajes

| Lenguaje | Uso |
|---|---|
| **TypeScript** | Aplicación, motor agronómico y acceso a datos |
| **Node.js (ESM)** | Script de datos regionales (`npm run data`) |
| **CSS** | Sistema de diseño con Tailwind v4 |

### Frontend

| Herramienta | Función |
|---|---|
| **React 19** | Interfaz de usuario |
| **Vite 6** | Empaquetado y desarrollo |
| **MapLibre GL JS 5** | Globo 3D y mapa 2D satelital, capas vectoriales y workers |
| **d3-geo + TopoJSON** | Selección geográfica y geometrías administrativas compactas |
| **Leaflet 1.9** | Mapa 2D de respaldo cuando WebGL2 no está disponible |
| **Tailwind CSS v4** | Estilos y tokens de diseño |
| **Zustand** | Estado global (punto, cultivo, prioridades, escenario) |
| **TanStack Query** | Caché de consultas por coordenada |
| **i18next + react-i18next** | Interfaz bilingüe |
| **lucide-react** | Iconografía |
| **vite-plugin-pwa** | Funcionamiento sin conexión |
| **Vitest** | Pruebas del motor y de las traducciones |

### Infraestructura

| Herramienta | Función |
|---|---|
| **Vercel** | Hospedaje estático en CDN global |
| **GitHub** | Control de versiones |

**No se usa:** backend propio, base de datos, Docker ni servicios de pago.

### Hardware

**Para desarrollar**

| Componente | Mínimo | Recomendado |
|---|---|---|
| CPU | 4 núcleos | 6 núcleos |
| RAM | 8 GB | 16 GB |
| GPU | Integrada | Con WebGL2 |
| Disco | 1 GB libre | 5 GB |

**Para usar RotaSmart**

Cualquier navegador moderno (Chrome, Edge, Firefox, Safari) en computador o celular.
El globo usa WebGL2; los equipos sin soporte reciben el mapa 2D de respaldo. Se necesita conexión a internet para nuevas imágenes y consultas a NASA POWER.

---

## 7. Estructura del proyecto

```text
rotasmart/
├─ src/
│  ├─ app/          composición de la aplicación (App.tsx)
│  ├─ components/   globo, ubicación, cultivo, viabilidad, sitio, rotaciones
│  ├─ engine.ts     motor agronómico: viabilidad y rotaciones
│  ├─ site.ts       consulta a NASA POWER, SoilGrids y geocodificación
│  ├─ i18n/         traducciones español / inglés
│  ├─ store.ts      estado global
│  └─ index.css     sistema de diseño
├─ public/          activos estáticos (icono)
├─ scripts/         pipeline regional opcional (NASA POWER → JSON)
├─ tests/           pruebas del motor y de i18n
├─ vercel.json      cabeceras de seguridad y caché
├─ CREDITS.md       fuentes, licencias y atribuciones
└─ README.md
```

---

## 8. Ejecución local

```bash
npm install
npm run dev
```

```bash
npm run test     # pruebas
npm run build    # producción
npm run data     # regenerar los JSON regionales del Huila (opcional)
npm run globe    # regenerar la geometría del globo (países, ríos, lagos, ciudades)
npm run boundaries # regenerar los límites de Colombia (departamentos y municipios)
npm run boundaries:world:download # descargar CGAZ ADM1/ADM2 (unos 870 MB, solo desarrollo)
npm run boundaries:world # generar el catálogo mundial y archivos por país
```

Los límites globales ADM0–2 viajan como archivos estáticos en `public/data/world/`.
`index.json` conserva la procedencia, fecha de generación y SHA-256 de las fuentes;
referencia archivos TopoJSON por país y nivel con hash de contenido. El generador
procesa los GeoJSON originales por streaming y simplifica arcos compartidos para
conservar las subdivisiones vecinas. Los originales quedan en una carpeta temporal
ignorada, fuera de Git y Vercel. No hace falta regenerarlos al instalar o desplegar.

Las imágenes, los límites locales OSM y las etiquetas se solicitan a sus proveedores
solo para la vista actual. Nominatim respalda la selección cuando el catálogo no
contiene un área. La PWA guarda recursos visitados, con un número limitado de entradas;
explorar zonas nuevas y consultar datos agroclimáticos requiere conexión.

---

## 9. Despliegue

**Producción:** <https://rotasmart-zeta.vercel.app/>

Proyecto Vercel: `rota-smart/rotasmart`. Repositorio: `HugoFM18/RotaSmart`.
La rama de producción es `Hugo`; los cambios publicados en esa rama se despliegan automáticamente.

```bash
npm run build
vercel --prod
```

`vercel.json` aplica HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy` y caché inmutable para `/assets`. Los archivos
de `/data` se revalidan para evitar geometrías antiguas tras un despliegue.

---

## 10. Rendimiento

Los criterios de viabilidad, perfiles indicativos, tratamiento de datos ausentes y
limitaciones del modelo se explican en [el modelo agroclimático](docs/agronomic-model.md).
El cálculo supone cultivo al aire libre y de secano: el frío incompatible o la falta
de agua no se compensan con un buen suelo o con prioridades de ingreso. Las rotaciones
solo se recomiendan si todos sus cultivos superan los requisitos básicos de la zona.

| Métrica | Objetivo |
|---|---|
| Carga inicial (interfaz) | < 1,2 s |
| Globo interactivo | < 2 s en primera visita |
| Consulta de un punto (NASA POWER) | 0,8–1,5 s |
| Recálculo al cambiar cultivo o prioridad | < 16 ms |

---

## 11. Atribución

- Proyecto **independiente**: no está afiliado ni respaldado por la NASA.
- **No se utilizan logos, banderas ni identificadores de misión de la NASA.**
- Todos los datos, librerías y fuentes se documentan en [`CREDITS.md`](CREDITS.md).
- El uso de herramientas de inteligencia artificial se declara en el formulario oficial.

---

**RotaSmart** — *evidencia para cada decisión.*
