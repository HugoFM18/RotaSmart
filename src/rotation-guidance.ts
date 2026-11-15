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
};
