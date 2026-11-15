import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { useStore } from "../src/store";
import type { SiteData } from "../src/site";
import es from "../src/i18n/es.json";

vi.mock("../src/components/GlobeView", () => ({ GlobeView: () => null }));
// SSR normally reads Zustand's initial snapshot. Read the current client snapshot
// here so each render exercises the crop selector's actual stored value.
vi.mock("../src/store", async importOriginal => {
  const actual = await importOriginal<typeof import("../src/store")>();
  const useStore = Object.assign(
    (selector: (state: ReturnType<typeof actual.useStore.getState>) => unknown) => selector(actual.useStore.getState()),
    actual.useStore,
  );
  return { ...actual, useStore };
});

const initialState = useStore.getState();
afterEach(() => useStore.setState(initialState));

const site: SiteData = {
  lat: 3, lon: -75, climateCell: { lat: 3, lon: -75 }, soilSource: "estimated",
  annual: { ppt: 1800, et0: 1200, tmean: 24, aridity: 1.5 },
  trends: { t2m: 0, ppt: 0 },
  hazards: { frost: 0, heat: 0, drought: 0, erosivity: 0.5 },
  soil: { clay: 32, sand: 40, om: 3, ph: 6.2, cec: 17 },
  climate: {
    t2m: Array(12).fill(24), tmax: Array(12).fill(29), tmin: Array(12).fill(19),
    ppt: Array(12).fill(150), et0: Array(12).fill(100), rh: [], wind: [], solar: [],
  },
};

describe("selected crop → site analysis → rendered recommendations", () => {
  it("uses the crop selector state for the actual app ranking", async () => {
    const i18n = createInstance();
    await i18n.init({ lng: "es", resources: { es: { translation: es } } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    client.setQueryData(["climate-v3", 3, -75], site);
    client.setQueryData(["soil-v2", initialState.lat.toFixed(4), initialState.lon.toFixed(4)], site.soil);

    const renderRanking = () => {
      const html = renderToStaticMarkup(createElement(QueryClientProvider, { client },
        createElement(I18nextProvider, { i18n }, createElement(App))));
      return html.slice(html.indexOf(es.ranking.title));
    };

    try {
      useStore.getState().setCrop("cafe");
      const coffee = renderRanking();
      expect(coffee).toContain(es.rotations.r3);
      expect(coffee).toContain(es.rotations.r9);
      expect(coffee).toContain(es.rotations.r10);
      expect(coffee.match(/aria-controls="rotation-guidance-/g)).toHaveLength(3);
      expect(coffee).not.toContain(es.rotations.r5);
      expect(coffee).not.toContain(es.rotations.r8);
      expect(coffee).toContain("Cenicafé");

      useStore.getState().setCrop("frijol");
      expect(renderRanking().match(/aria-controls="rotation-guidance-/g)).toHaveLength(3);

      useStore.getState().setCrop("yuca");
      const cassava = renderRanking();
      expect(cassava).toContain(es.rotations.r5);
      expect(cassava).toContain(es.rotations.r11);
      expect(cassava).toContain(es.rotations.r12);
      expect(cassava.match(/aria-controls="rotation-guidance-/g)).toHaveLength(3);
      expect(cassava).not.toContain(es.rotations.r3);
      expect(cassava).not.toContain(es.rotations.r9);
      expect(cassava).not.toContain(es.rotations.r10);

      client.setQueryData(["soil-v2", initialState.lat.toFixed(4), initialState.lon.toFixed(4)], { ...site.soil, ph: 8 });
      useStore.getState().setCrop("cafe");
      const incompatible = renderRanking();
      expect(incompatible).toContain("No hay opciones del catálogo que incluyan Café");
      expect(incompatible).not.toContain('id="rotation-guidance-');
    } finally {
      client.clear();
    }
  });
});
