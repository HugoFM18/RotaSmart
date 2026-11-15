# Explicaciones y fuentes de las rotaciones

Cada opción del ranking tiene cinco párrafos breves y un sexto con un enlace a la
referencia. El texto se encuentra en `rotationGuidance` de `src/i18n/es.json` y
`src/i18n/en.json`; `src/rotation-guidance.ts` vincula cada opción con su fuente.
Son síntesis editoriales, no citas textuales ni una validación del puntaje numérico.

El catálogo incluye 17 sistemas. Cada uno de los diez perfiles de cultivo aparece
en al menos tres alternativas distintas. Solo se muestran las tres mejor puntuadas
que incluyen el cultivo seleccionado y cumplen los filtros agroclimáticos: puede
haber menos de tres en un sitio concreto. No se generan combinaciones automáticamente
para completar el cupo. Algunos sistemas tienen dos cultivos y otros tres.

| Opción | Referencia | Alcance y limitación |
|---|---|---|
| r1: maíz–fríjol–cobertura | [Nassary et al., 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7792662/) — *Intensification of common bean and maize production through rotations to improve food security for smallholder farmers*. DOI: 10.1016/j.jafr.2020.100040. | Ensayo de maíz y fríjol común en Tanzania. No evalúa la tercera fase de cobertura del catálogo. |
| r2, r7 y r8 | [FAO, 2000](https://www.fao.org/4/x4799e/x4799e.pdf#page=169) — *Manual on integrated soil management and conservation practices*, capítulo 16, pp. 156–157; capítulos 10 y 12 para coberturas. | Principios generales de conservación y alternancia; no ensayos de estas secuencias completas. Pastura y cobertura todavía son perfiles genéricos. |
| r3: café con fríjol intercalado | [Jaramillo, 2023, Cenicafé, Avance 551](https://publicaciones.cenicafe.org/index.php/avances_tecnicos/article/view/333). DOI: 10.38141/10779/0551. | Guía de fríjol arbustivo intercalado durante la etapa improductiva del café a libre exposición solar. La edad y sombra del cafetal aún no se capturan; no se valida una cobertura genérica. |
| r9: café con maíz intercalado | [Jaramillo, 2021, Cenicafé](https://publicaciones.cenicafe.org/index.php/libros_manuales/article/view/828) — *Manejo agronómico de cultivos intercalados con café*. DOI: 10.38141/10791/0014_5. | Maíz durante el levante en nuevas siembras o zocas, principalmente a libre exposición. Requiere manejo independiente de nutrición y densidad. La cobertura genérica debe seleccionarse localmente. |
| r10: café con plátano de sombra | [Farfán Valencia, 2016, Cenicafé, Boletín 41](https://publicaciones.cenicafe.org/index.php/bot/article/view/1299) — *Sombríos transitorios para el establecimiento del café*. DOI: 10.38141/10781/041. | Plátano como sombrío transitorio durante el establecimiento del café. La oferta ambiental, la etapa y el manejo del sombrío deben verificarse. No se modela el efecto de la sombra en el puntaje. |
| r4: arroz–fríjol–maíz | [Caicedo Guerrero, Navas Ríos y Bernal Riobo, 1998, CORPOICA](https://repository.agrosavia.co/handle/20.500.12324/21132). | Estudia arroz–soya y maíz–soya bajo tres sistemas de labranza en el Piedemonte Llanero. Es evidencia relacionada, no una validación de arroz–fríjol–maíz. |
| r5: yuca–fríjol–cobertura | [Trung et al., 2022](https://so01.tci-thaijo.org/index.php/APST/article/view/261600) — *Cassava-cowpea intercropping system for controlling soil erosion in the Northern mountainous areas of Vietnam*. DOI: 10.14456/apst.2022.74. | Ensayo de asociación de yuca con caupí en laderas de Vietnam. Cambian la especie y el arreglo respecto del catálogo; la tarjeta hace explícita esa diferencia. |
| r6: cacao con plátano | [AGROSAVIA, 2022](https://editorial.agrosavia.co/index.php/publicaciones/catalog/book/276) — *Modelo productivo para el cultivo de cacao (Theobroma cacao L.) en el departamento de Santander*, segunda edición. DOI: 10.21930/agrosavia.model.7405538. | Guía regional de cacao agroforestal y sombrío transitorio. Requiere adaptar sombra, espaciamiento y especie de cobertura. |
| r11: yuca con maíz intercalado | [FAO, 2013](https://www.fao.org/4/i3447e/i3447e.pdf) — *Cassava Farmer Field Schools*, apartado «Intercropping», p. 82. | Guía para África subsahariana con maíz como cultivo asociado. Requiere adaptación de variedades, densidad, calendario y manejo nutricional. |
| r12: cobertura antes de yuca | [FAO, 2011](https://www.fao.org/4/i2190e/i2190e00.pdf) — *Green manure/cover crops and crop rotation in Conservation Agriculture on small farms*. | Experiencias de Paraguay con abonos verdes, residuos y yuca en siembra sin labranza. Se propone cobertura previa terminada, no una trepadora activa compitiendo con yuca. |
| r13: cacao, plátano y fríjol | [AGROSAVIA, modelo agroforestal de cacao con maderas finas tropicales](https://www.agrosavia.co/media/j5jdwreb/13_infografia-saf-cacao.pdf). | Integra plátano transitorio y fríjol durante el establecimiento. El modelo completo incluye árboles maderables, ausentes de nuestros perfiles; las condiciones del arreglo deben verificarse. |
| r14: cacao con maíz de establecimiento | [AGROSAVIA, 2022](https://editorial.agrosavia.co/index.php/publicaciones/catalog/book/276). | Cultivos de pancoger entre surcos durante el establecimiento. No se valida una cobertura genérica ni cualquier grado de sombra o densidad. |
| r15: arroz y pastura de relevo | [AGROSAVIA, 2020, oferta genética para la Orinoquía](https://www.agrosavia.co/noticias/d%C3%ADa-de-campo-sobre-oferta-gen%C3%A9tica-de-soya-y-arroz-para-la-orinoqu%C3%ADa-colombiana). | Arroz Llanura 11 asociado con pastos para establecer pasturas en la Altillanura. Es una referencia varietal y regional, no extrapolable a todo arroz o pastura. |
| r16: abono verde antes de arroz | [Embrapa, *Arroz: 500 perguntas, 500 respostas*](https://www.infoteca.cnptia.embrapa.br/bitstream/doc/964487/1/500perguntasarroz.pdf), pregunta 101, p. 65. | Orientación general sobre abonos verdes, materia orgánica y reciclaje de nutrientes. Identificar especie y sistema hídrico antes de aplicar la práctica; el motor evalúa secano. |
| r17: sorgo y pastura intercalada | [Silva et al., 2014, Revista Ceres](https://www.scielo.br/j/rceres/a/33XhrbynktyQCjrcD5YThJC/). DOI: 10.1590/0034-737X201461050013. | Ensayo en Rio Verde, Brasil, de sorgo granífero y especies de braquiaria entre surcos. La especie y profundidad modificaron los resultados; no se valida cualquier pastura ni se garantiza mantener el rendimiento del grano. |

Café y cacao se presentan como asociaciones, conservando el cultivo perenne. El
motor sigue filtrando por compatibilidad individual de clima y suelo: no comprueba
interacciones, calendario conjunto, fertilizantes aplicados ni impactos ambientales
medidos del lote. Por eso la explicación distingue evidencia relacionada y guía
general de los resultados de un ensayo de la práctica concreta.

Las cinco entradas son bloques de texto: pueden ocupar más de cinco líneas físicas
en una pantalla pequeña. No se recortan condiciones ni advertencias para forzar altura.
