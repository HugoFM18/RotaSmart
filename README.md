# RotaSmart

**Herramienta de apoyo a decisiones para rotaciones de cultivo con datos de la NASA.**

> Reto: **"Cambio de rumbo: Adaptando las granjas con datos de la NASA"**
> *(Field Shift: Adapting Farms with NASA Data — NASA Space Apps Challenge 2026)*

**Demo en vivo:** <https://johncamilogarzonvargas.github.io/RotaSmart/>

---

## 1. Contexto

Los agricultores enfrentan temperaturas cambiantes, lluvias irregulares, sequías, eventos
extremos y pérdida de salud del suelo. Elegir qué sembrar después de cada cosecha es una
decisión de alto impacto que hoy se toma por costumbre o intuición, sin evidencia del
comportamiento real de su territorio.

**RotaSmart** convierte veinte años de observaciones satelitales de la NASA y datos locales
de suelo en una recomendación comprensible: qué rotación conviene, por qué, y qué pasa si
el clima cambia.

El proyecto se enfoca en **Colombia** (33 departamentos) con datos detallados para los
**37 municipios del Huila**.

---

## 2. Qué hace

1. El usuario elige un municipio en el mapa o lo busca por nombre.
2. RotaSmart muestra el perfil agroclimático: suelo, pendiente, lluvia, temperatura,
   humedad del suelo y vegetación de los últimos 20 años.
3. El agricultor ajusta sus prioridades con cinco controles: **agua, ingreso, riesgo,
   suelo y mano de obra**.
4. El motor ordena las rotaciones posibles y explica **por qué** cada una sube o baja.
5. Un simulador climático responde al instante: *"¿y si llueve 20 % menos?"*.

---

## 3. Características

- **Mapa interactivo** con coropleto por municipio y capas satelitales de la NASA.
- **Ranking de rotaciones** evaluado en ocho indicadores: agua, cobertura del suelo,
  nutrientes, erosión, interrupción de plagas, ingreso, resiliencia climática y mano de obra.
- **Explicabilidad**: cada recomendación indica por qué sube o baja.
- **Prioridades del agricultor** con cinco controles que reordenan el ranking en vivo.
- **Escenario climático interactivo**: lluvia ±30 % y temperatura de −1 a +3 °C.
- **Perfil agroclimático** con ciclo anual y tendencia 2005–2024.
- **Riesgos climáticos** y estimación de propiedades del suelo.
- **Interfaz bilingüe** español / inglés con un solo botón.
- **Funciona sin conexión** (PWA) tras la primera visita.
- **Sin registro, sin contraseña, sin instalación.**

---

## 4. APIs y datos de la NASA

Todas las fuentes de NASA son abiertas y gratuitas. Las marcadas con ✅ no requieren
clave de API ni registro.

| API / Servicio | Qué entrega | Uso en RotaSmart | Clave |
|---|---|---|---|
| **NASA POWER** | Meteorología y energía solar: temperatura, precipitación, humedad, viento y radiación, en series diarias, mensuales y climatologías (1991–presente). | Base del balance hídrico, grados día de crecimiento, riesgo de helada y olas de calor. | ✅ No |
| **NASA GIBS** (Global Imagery Browse Services) | Tiles de imagen satelital en formato WMTS, listos para mapas web. | Capas visuales del mapa: NDVI, precipitación, humedad del suelo y temperatura superficial. | ✅ No |
| **NASA SMAP** | Humedad del suelo (superficial y radicular) cada 2–3 días. | Déficit hídrico real del lote y detección de estrés. | ✅ No (vía GIBS) |
| **NASA GPM / IMERG** | Precipitación global de alta resolución temporal. | Distribución de lluvia, eventos extremos y lluvia erosiva. | ✅ No (vía GIBS) |
| **NASA MODIS** | Índices de vegetación (NDVI/EVI) y temperatura de superficie. | Estado y tendencia de la vegetación; estrés térmico. | ✅ No (vía GIBS) |
| **NASA SRTM** | Modelo digital de elevación de 30 m. | Pendiente del terreno y riesgo de erosión. | ✅ No |
| **NASA Landsat** | Reflectancia superficial de 30 m desde 1984. | Análisis histórico extendido (opcional). | ⚠️ Earthdata Login |
| **NASA AppEEARS** | Extracción de series de tiempo por punto o polígono. | Subsetting masivo de SMAP/MODIS (opcional). | ⚠️ Earthdata Login |

### Endpoints principales

```text
NASA POWER (mensual, punto):
https://power.larc.nasa.gov/api/temporal/monthly/point
  ?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN
  &community=AG&longitude=-75.28&latitude=2.93
  &start=2005&end=2024&format=JSON

NASA GIBS (tile WMTS):
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{CAPA}/default/{FECHA}/
  GoogleMapsCompatible_Level{9}/{z}/{y}/{x}.{ext}
```

**Capas GIBS verificadas:**

| Variable | Capa | Formato |
|---|---|---|
| NDVI | `MODIS_Terra_L3_NDVI_16Day` | png |
| Precipitación | `IMERG_Precipitation_Rate` | png |
| Humedad de suelo | `SMAP_L4_Analyzed_Root_Zone_Soil_Moisture` | png |
| Temperatura superficial | `MODIS_Terra_L3_Land_Surface_Temp_Daily_Day` | png |
| Imagen satelital | `MODIS_Terra_CorrectedReflectance_TrueColor` | jpg |

> Requisito del reto: se usa **al menos un recurso de datos de la NASA**. RotaSmart usa seis.
> Enlaces completos en [`CREDITS.md`](CREDITS.md).

### Otras fuentes

| Fuente | Aporte | Licencia |
|---|---|---|
| **Propiedades del suelo** | Arcilla, arena, materia orgánica, pH y CEC, estimadas a partir del clima de NASA POWER (la API pública de SoilGrids no cubre la región) | — |
| **geoBoundaries** | Límites administrativos ADM1 / ADM2 | CC BY 4.0 |
| **FAO-56** | Coeficientes de cultivo (Kc) | Público |
| **CARTO / OpenStreetMap** | Mapa base | Atribución |

---

## 5. Cómo funciona

```text
Pipeline (antes del evento)             Navegador
─────────────────────────                ─────────────────────────
POWER ─┐                                 Mapa (MapLibre)
GIBS  ─┤                                 │
SMAP  ─┼─► agregación mensual ─► JSON ──►├─ Perfil del municipio
SRTM  ─┤   por municipio                 ├─ Ranking de rotaciones
Suelo ─┘                                 ├─ Panel "¿por qué?"
                                         └─ Escenarios climáticos
```

El procesamiento pesado se ejecuta **fuera del navegador**. El cliente solo recibe
agregados pequeños y aplica un motor de reglas determinista, por lo que la respuesta es
instantánea y el resultado es auditable.

---

## 6. Tecnologías

### Lenguajes

| Lenguaje | Uso |
|---|---|
| **TypeScript** | Aplicación web, motor de decisión y tipos de datos |
| **Node.js (ESM)** | Pipeline de datos: NASA POWER y agregados |
| **CSS** | Sistema de diseño con variables (Tailwind v4) |
| **Shell / PowerShell** | Scripts de construcción y despliegue |

### Frontend

| Herramienta | Función |
|---|---|
| **React 19** | Interfaz de usuario |
| **Vite 6** | Empaquetado y desarrollo |
| **MapLibre GL JS 5** | Mapa vectorial acelerado por GPU |
| **Tailwind CSS v4** | Estilos y sistema de diseño |
| **Zustand** | Estado global (municipio, prioridades, escenario) |
| **TanStack Query** | Carga y caché de datos |
| **i18next + react-i18next** | Interfaz bilingüe español / inglés |
| **vite-plugin-pwa** | Funcionamiento sin conexión |
| **Vitest** | Pruebas del motor y de las traducciones |

### Datos y geoespecial

| Herramienta | Función |
|---|---|
| **Node.js 22** | Consulta de NASA POWER y generación de agregados |
| **mapshaper** | Simplificación de límites (GeoJSON) |
| **fetch nativo** | Consumo de APIs |

### Infraestructura

| Herramienta | Función |
|---|---|
| **GitHub Pages** | Hospedaje estático en CDN global (rama `gh-pages`, sin servidor) |
| **Git + GitHub** | Control de versiones |
| **VS Code** | Entorno de desarrollo |

**No se usa:** backend propio, base de datos, Docker ni servicios de pago.

### Hardware

**Para desarrollar**

| Componente | Mínimo | Recomendado |
|---|---|---|
| CPU | 4 núcleos | 6 núcleos o más |
| RAM | 8 GB | 16 GB |
| Disco | 2 GB libres | 10 GB (datos crudos) |
| GPU | Integrada | Con WebGL2 |

**Para usar RotaSmart**

Cualquier navegador moderno (Chrome, Edge, Firefox, Safari) en computador o celular.
Solo requiere WebGL2 y conexión a internet la primera vez. No requiere instalación.

---

## 7. Estructura del proyecto

```text
rotasmart/
├─ src/
│  ├─ app/          aplicación, rutas y tema
│  ├─ map/          mapa, capas NASA GIBS y coropleto
│  ├─ features/     selección, perfil, rotaciones, escenarios, explicación
│  ├─ engine/       motor de puntuación y escenarios
│  ├─ data/         hooks de carga de datos
│  └─ ui/           componentes y tokens de diseño
├─ public/data/     agregados JSON y límites geográficos
├─ scripts/         pipeline de datos (NASA POWER → JSON)
├─ tests/           pruebas del motor y de i18n
├─ CREDITS.md       fuentes, licencias y atribuciones
└─ README.md
```

---

## 8. Ejecución local

```bash
# 1. Dependencias
npm install

# 2. Desarrollo
npm run dev

# 3. Pruebas
npm run test

# 4. Construcción
npm run build
```

```bash
# Pipeline de datos (opcional: regenera public/data desde NASA POWER)
npm run data
```

Requiere conexión a internet. El script consulta la API de NASA POWER para los
37 municipios del Huila y escribe un JSON compacto por municipio.

---

## 9. Despliegue

El sitio se publica con **GitHub Pages** desde la rama `gh-pages` (sin depender de
GitHub Actions):

```bash
# La compilación para Pages usa la ruta base /RotaSmart/
$env:GITHUB_ACTIONS="true"; npm run build
```

Luego se publica el contenido de `dist/` en la rama `gh-pages`:

```bash
git subtree push --prefix dist origin gh-pages
```

**URL:** <https://johncamilogarzonvargas.github.io/RotaSmart/>

---

## 10. Rendimiento objetivo

| Métrica | Objetivo |
|---|---|
| Carga inicial (interfaz) | < 1,2 s |
| Mapa interactivo | < 2 s en primera visita |
| Cambio de municipio | < 100 ms |
| Actualización de escenario | < 16 ms |

---

## 10. Atribución y buenas prácticas

- Proyecto **independiente**: no está afiliado ni respaldado por la NASA.
- **No se utilizan logos, banderas ni identificadores de misión de la NASA.** La
  atribución se hace por texto.
- Todos los datos, librerías, fuentes tipográficas e imágenes se documentan con enlace y
  licencia en [`CREDITS.md`](CREDITS.md).
- El uso de herramientas de inteligencia artificial se declara en el formulario oficial
  del reto.

---

## 11. Enlaces

- Reto: <https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/>
- NASA POWER: <https://power.larc.nasa.gov/>
- NASA GIBS: <https://nasa.github.io/nasa-gibs/>
- NASA SMAP: <https://smap.jpl.nasa.gov/>
- NASA GPM: <https://gpm.nasa.gov/>

---

**RotaSmart** — *evidencia para cada rotación.*
