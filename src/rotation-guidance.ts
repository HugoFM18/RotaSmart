/** Editorial guidance explains practices; it does not validate the model's score.
 * Source scope and the five localized statements live in i18n/rotationGuidance.
 * See docs/rotation-evidence.md for the limits of each reference.
 */
export const GUIDANCE_LINES = ["benefit", "soil", "management", "care", "scope"] as const;

const REFERENCES = {
  maizeBeans: {
    label: "Nassary et al. · 2020",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7792662/",
  },
  conservation: {
    label: "FAO · 2000",
    url: "https://www.fao.org/4/x4799e/x4799e.pdf#page=169",
  },
  coffeeBeans: {
    label: "Cenicafé · 2023 · Avance 551",
    url: "https://publicaciones.cenicafe.org/index.php/avances_tecnicos/article/view/333",
  },
  coffeeMaize: {
    label: "Cenicafé · 2021 · Cultivos intercalados",
    url: "https://publicaciones.cenicafe.org/index.php/libros_manuales/article/view/828",
  },
  coffeePlantain: {
    label: "Cenicafé · 2016 · Boletín 41",
    url: "https://publicaciones.cenicafe.org/index.php/bot/article/view/1299",
  },
  riceLegumes: {
    label: "CORPOICA · 1998",
    url: "https://repository.agrosavia.co/handle/20.500.12324/21132",
  },
  cassavaLegumes: {
    label: "Trung et al. · 2022",
    url: "https://so01.tci-thaijo.org/index.php/APST/article/view/261600",
  },
  cacaoPlantain: {
    label: "AGROSAVIA · 2022",
    url: "https://editorial.agrosavia.co/index.php/publicaciones/catalog/book/276",
  },
  cassavaMaize: {
    label: "FAO · 2013 · Escuelas de campo de yuca",
    url: "https://www.fao.org/4/i3447e/i3447e.pdf",
  },
  cassavaCover: {
    label: "FAO · 2011 · Abonos verdes y rotaciones",
    url: "https://www.fao.org/4/i2190e/i2190e00.pdf",
  },
  cacaoFoodCrops: {
    label: "AGROSAVIA · Modelo agroforestal de cacao",
    url: "https://www.agrosavia.co/media/j5jdwreb/13_infografia-saf-cacao.pdf",
  },
  ricePasture: {
    label: "AGROSAVIA · 2020 · Arroz Llanura 11",
    url: "https://www.agrosavia.co/noticias/d%C3%ADa-de-campo-sobre-oferta-gen%C3%A9tica-de-soya-y-arroz-para-la-orinoqu%C3%ADa-colombiana",
  },
  riceCover: {
    label: "Embrapa · Arroz · Pregunta 101",
    url: "https://www.infoteca.cnptia.embrapa.br/bitstream/doc/964487/1/500perguntasarroz.pdf",
  },
  sorghumPasture: {
    label: "Silva et al. · 2014 · Revista Ceres",
    url: "https://www.scielo.br/j/rceres/a/33XhrbynktyQCjrcD5YThJC/",
  },
} as const;

export const ROTATION_REFERENCES: Partial<Record<string, typeof REFERENCES[keyof typeof REFERENCES]>> = {
  r1: REFERENCES.maizeBeans,
  r2: REFERENCES.conservation,
  r3: REFERENCES.coffeeBeans,
  r4: REFERENCES.riceLegumes,
  r5: REFERENCES.cassavaLegumes,
  r6: REFERENCES.cacaoPlantain,
  r7: REFERENCES.conservation,
  r8: REFERENCES.conservation,
  r9: REFERENCES.coffeeMaize,
  r10: REFERENCES.coffeePlantain,
  r11: REFERENCES.cassavaMaize,
  r12: REFERENCES.cassavaCover,
  r13: REFERENCES.cacaoFoodCrops,
  r14: REFERENCES.cacaoPlantain,
  r15: REFERENCES.ricePasture,
  r16: REFERENCES.riceCover,
  r17: REFERENCES.sorghumPasture,
};
