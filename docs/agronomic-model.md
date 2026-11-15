# Criterios del modelo agroclimático

Este índice es una estimación exploratoria para cultivo **al aire libre y de secano**.
No supone invernadero, calefacción, riego, deshielo ni mejora artificial del suelo.
No es un rendimiento previsto ni una probabilidad de éxito.

## Datos y calidad

- NASA POWER mensual, referencia 2005–2024. `YYYY13` es un resumen anual: se omite al calcular los doce promedios mensuales. Se usan todos los años, sin depender del orden de las claves.
- Se excluyen `-999`, valores ausentes y no finitos. Cada mes debe conservar al menos diez años válidos de temperatura media, máxima, mínima y precipitación. Es un mínimo de cobertura del producto, no una norma climatológica oficial. Sin esa cobertura no se emite evaluación.
- PRECTOTCORR se convierte de mm/día a mm/mes antes de promediar, respetando los años bisiestos. ETo se estima con Hargreaves; no se eleva artificialmente a 1 mm para dividir.
- Las coordenadas de los datos deben coincidir con el punto seleccionado. La interfaz descarta la evaluación anterior mientras carga otra ubicación, también si la nueva petición falla.
- POWER representa una celda climática regional; no verifica el microclima ni el suelo exacto de una parcela.
- Se solicitan solo las cuatro variables utilizadas por el modelo: T2M, T2M_MAX, T2M_MIN y PRECTOTCORR. Se conserva el periodo completo y la validación de los doce meses.
- Las consultas meteorológicas se reutilizan por celda nativa MERRA-2 (0,5° × 0,625°). El índice conserva las coordenadas del punto seleccionado y consulta SoilGrids por separado para ese punto. La coincidencia de valores dentro de la celda se contrastó con NASA en Neiva y la Antártida. El extremo oriental se limita a 179,375° como el servicio POWER, sin envolverlo a la celda occidental.
- El clima se muestra en cuanto responde NASA, con suelo estimado identificado como provisional mientras se verifica SoilGrids. Si llega suelo válido, se actualiza el resultado. El bloqueo de suelo en clima helado sigue vigente.
- Se almacenan hasta 32 respuestas históricas válidas en la caché local durante siete días. El acceso a almacenamiento es opcional; los datos incompletos no se almacenan y las entradas recuperadas se revalidan. Las consultas de puntos abandonados se cancelan.

## Requisitos que no pueden compensarse

Se examinan ventanas consecutivas de meses, incluidas las que cruzan diciembre/enero.
Los cultivos anuales se comparan con su ventana de crecimiento y no con el invierno
fuera de temporada. Los perennes se examinan durante todo el año.

`GROWING_REQUIREMENTS` en `src/engine.ts` contiene los perfiles iniciales:

| Cultivo | Media mínima de crecimiento, °C | Meses consecutivos | Referencia mínima de agua en esa ventana, mm |
|---|---:|---:|---:|
| Maíz | 15 | 4 | 500 |
| Fríjol | 10 | 3 | 300 |
| Sorgo | 15 | 4 | 450 |
| Arroz | 15 | 4 | 450 |
| Yuca | 18 | 8 | 500 |
| Café | 14 | 12 | 900 |
| Plátano | 18 | 12 | 1200 |
| Cacao | 18 | 12 | 1200 |
| Cobertura genérica | 5 | 3 | 200 |
| Pastura genérica | 10 | 3 | 300 |

Son valores indicativos de cribado: las variedades, la edad de los perennes, el ciclo
local y las especies de cobertura/pastura requieren calibración agronómica. Los meses
son una aproximación de la duración, no un calendario diario de siembra o de heladas.
Los umbrales de puntuación y los perfiles genéricos son decisiones de este producto;
no constituyen una implementación certificada de FAO-AEZ.

- La ventana debe cumplir la temperatura mínima de crecimiento y los límites de frío/calor del perfil. Sin ventana compatible, el resultado es 0 / no recomendado.
- Si todas las máximas mensuales climatológicas son ≤0 °C, se aplica bloqueo térmico global. Se excluye el agua congelada y no se infiere suelo fértil con el estimador climático. Esto **no es una observación satelital de cobertura de hielo**: la limitación se deriva de la temperatura y sirve también fuera de la Antártida.
- El agua se compara con la demanda en la misma ventana: `máximo(ETo × Kc, referencia mínima de agua)`. La tolerancia a sequía no elimina esta necesidad. No se traslada automáticamente lluvia invernal a un verano seco ni se supone una reserva de agua en el suelo.
- Con menos del 20% de esa demanda cubierta, el resultado es 0. Entre 20–50% se limita a 34; entre 50–75%, a 74. El rendimiento real con déficit y el aporte del riego no se modelan.
- Una puntuación térmica <20 se limita a 19; <45, a 34; <70, a 74. Un suelo ausente o inválido no permite declarar viabilidad (máximo 54); también se limitan pH o ajustes edáficos muy desfavorables.
- El escenario de temperatura se aplica por igual a medias, mínimas y máximas de todos los meses. La precipitación cambia por el porcentaje seleccionado.

El promedio ponderado agua/temperatura/suelo/riesgo se calcula **después** de estas
condiciones y queda limitado por ellas. Las rotaciones no pueden superar la viabilidad
de su cultivo menos compatible, cualquiera que sea la prioridad económica. Solo se
muestran como recomendaciones cuando todos sus cultivos alcanzan al menos 55 y la
opción incluye el cultivo seleccionado por el agricultor. Cambiar de cultivo
actualiza el ranking. Se muestran como máximo las tres opciones compatibles mejor
puntuadas; no se completa la lista con sistemas incompatibles. Si no hay opciones
compatibles en el catálogo para ese cultivo,
se muestra un mensaje específico, sin sustituirlas por sistemas de otros cultivos.
No se asegura que sus ventanas independientes formen una secuencia viable en un solo año.

El ranking añade cinco párrafos de beneficios, manejo y alcance de la evidencia,
seguidos de una fuente enlazada. Estas explicaciones no modifican ni certifican el
puntaje: las referencias y sus límites se documentan en
[evidencia de rotaciones](rotation-evidence.md). Café y cacao se muestran como
asociaciones con cultivos perennes, no como reemplazos sucesivos.

## Fuentes

- [NASA POWER: API mensual y anual](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/).
- [NASA POWER: resolución y uso de la cuadrícula nativa](https://power.larc.nasa.gov/docs/faqs/solar/) y [recomendaciones de consulta](https://power.larc.nasa.gov/docs/tutorials/service-data-request/api/).
- [FAO: necesidades de agua y duración de ciclos](https://www.fao.org/4/s2022e/s2022e07.htm), valores indicativos sujetos a variedad y clima. Para sorgo recoge un ciclo habitual de 120–130 días y una demanda de 450–650 mm.
- [FAO: ajuste entre régimen térmico y requisitos de cultivos](https://www.fao.org/4/t0737e/T0737E08.htm), que identifica medias inferiores a 15 °C como insuficientes para la producción normal de maíz y sorgo en esa evaluación.
- [FAO Ecocrop: Sorghum bicolor](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=48747), intervalo óptimo 22–35 °C. Los valores absolutos de supervivencia no equivalen a producción viable.

No se dispone aquí de cobertura terrestre observada, salinidad, profundidad efectiva,
pendiente, permafrost ni disponibilidad real de riego. No se certifica que un píxel
templado corresponda a terreno agrícola accesible. La información de SoilGrids se
distingue de la estimación climática; en clima persistentemente helado no se utiliza
esta estimación para inventar propiedades agrícolas.
