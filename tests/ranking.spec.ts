import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { ROTATIONS, type CropId, type Result } from "../src/engine";
import { RankingCard } from "../src/components/RankingCard";
import { ROTATION_REFERENCES } from "../src/rotation-guidance";
import es from "../src/i18n/es.json";
import en from "../src/i18n/en.json";

async function render(results: Result[], language: "es" | "en", crop: CropId = results[0]?.crops[0] ?? "maiz") {
  const i18n = createInstance();
  await i18n.init({ lng: language, resources: { es: { translation: es }, en: { translation: en } } });
  return renderToStaticMarkup(createElement(I18nextProvider, { i18n }, createElement(RankingCard, { results, crop })));
}

const results: Result[] = ROTATIONS.map(rotation => ({
  ...rotation,
  total: 65,
  eligible: true,
  reasons: [], // Guidance must appear even when the numeric model has no positive reasons.
  axes: { water: 0, cover: 0, nutrients: 0, erosion: 0, pest: 0, income: 0, resilience: 0, labor: 0 },
}));

describe("rotation explanations and evidence", () => {
  for (const language of ["es", "en"] as const) {
    it.each(results)(`shows five statements and the source in the sixth paragraph ($id, ${language})`, async result => {
      const html = await render([result], language);
      const guidance = html.slice(html.indexOf(`id="rotation-guidance-${result.id}"`));
      const paragraphs = guidance.match(/<p\b[^>]*>[\s\S]*?<\/p>/g) ?? [];
      expect(paragraphs).toHaveLength(6);
      expect(paragraphs.slice(0, 5).every(p => !p.includes("<a "))).toBe(true);
      expect(paragraphs[5]).toContain(`href="${ROTATION_REFERENCES[result.id]!.url}"`);
      expect(paragraphs[5]).toContain('target="_blank"');
      expect(paragraphs[5]).toContain('rel="noopener noreferrer"');
      expect(html).not.toContain("rotationGuidance.");
      expect(html).not.toContain("ranking.openSource");
      expect(html).toContain('aria-expanded="true"');
    });

    it(`keeps only the first recommendation expanded by default (${language})`, async () => {
      const html = await render(results, language);
      expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
      expect(html).toContain('aria-controls="rotation-guidance-r1"');
      expect(html).toContain('id="rotation-guidance-r2" hidden=""');
    });

    it(`shows the empty state without recommendations or evidence links (${language})`, async () => {
      const html = await render([], language);
      const translations = language === "es" ? es : en;
      expect(html).toContain(translations.ranking.unavailable.split(".")[0].replace("{{crop}}", translations.crops.maiz));
      expect(html).not.toContain("<a ");
    });

    it(`identifies coffee in the heading and in the empty state (${language})`, async () => {
      const html = await render([], language, "cafe");
      const translations = language === "es" ? es : en;
      expect(html).toContain(translations.ranking.subtitle.replace("{{crop}}", translations.crops.cafe));
      expect(html).toContain(translations.ranking.unavailable.split(".")[0].replace("{{crop}}", translations.crops.cafe));
      expect(html).not.toContain("{{crop}}");
    });
  }

  it("labels perennial systems as associations instead of sequential replacements", () => {
    for (const translations of [es, en]) {
      for (const id of ["r3", "r6", "r9", "r10", "r13", "r14"] as const) {
        expect(translations.rotations[id]).toContain("+");
        expect(translations.rotations[id]).not.toContain("→");
      }
    }
  });
});
