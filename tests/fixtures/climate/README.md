# Datos de regresión de NASA POWER

Respuestas públicas de NASA POWER obtenidas el 15 de noviembre de 2026. Periodo
solicitado: 2005–2024; sin modificar valores, unidades, sentinelas ni resúmenes YYYY13.
Se utilizan sin red en `tests/site.spec.ts`; SoilGrids se simula no disponible para
comprobar también la estimación de suelo y su exclusión en clima helado.

| Archivo | Latitud | Longitud |
|---|---:|---:|
| antarctica.json | -75.1 | 123.3 |
| sahara.json | 25 | 10 |
| neiva.json | 2.9345 | -75.2809 |
| temperate.json | 45 | -93 |
| neiva-grid.json | 3 | -75 |
| antarctica-grid.json | -75 | 123.125 |

Los dos archivos `*-grid.json` solicitan únicamente T2M, T2M_MAX, T2M_MIN y
PRECTOTCORR en el centro de la celda meteorológica nativa. Conservan exactamente
los mismos valores mensuales de esas cuatro variables que los puntos originales;
esa igualdad se comprueba en `tests/power-loading.spec.ts`.

Petición reproducible (sustituir LAT y LON):

```text
https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN&community=AG&longitude=LON&latitude=LAT&start=2005&end=2024&format=JSON
```

Fuente y documentación: https://power.larc.nasa.gov/docs/services/api/temporal/monthly/
Los valores son regionales; estos cuatro casos no validan por sí solos todas las
regiones, variedades o prácticas agrícolas. Son regresiones del procesamiento y de
las limitaciones esenciales, no una validación del rendimiento agrícola.
