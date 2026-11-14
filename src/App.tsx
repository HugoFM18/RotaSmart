import { lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Header } from "./components/Header";
import { SelectBar } from "./components/SelectBar";
import { ClimateCard } from "./components/ClimateCard";
import { PrioritiesCard } from "./components/PrioritiesCard";
import { ScenarioCard } from "./components/ScenarioCard";
import { RankingCard } from "./components/RankingCard";
import { useStore } from "./store";
import { evaluateAll, type MuniData } from "./engine";
import { getJson } from "./utils";

const MapView = lazy(() =>
  import("./components/MapView").then((m) => ({ default: m.MapView })),
);

type IndexEntry = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  aridity: number;
  trend: number;
  ppt: number;
};

export default function App() {
  const { t } = useTranslation();
  const selected = useStore((s) => s.selected);
  const setSelected = useStore((s) => s.setSelected);
  const priorities = useStore((s) => s.priorities);
  const scenario = useStore((s) => s.scenario);

  const geo = useQuery({
    queryKey: ["geo"],
    queryFn: () => getJson<any>("geo/huila.json"),
  });
  const index = useQuery({
    queryKey: ["index"],
    queryFn: () => getJson<IndexEntry[]>("index.json"),
  });
  const muni = useQuery({
    queryKey: ["muni", selected],
    queryFn: () => getJson<MuniData>(`m/${selected}.json`),
    enabled: !!selected,
  });

  const results = useMemo(
    () => (muni.data ? evaluateAll(muni.data, priorities, scenario) : []),
    [muni.data, priorities, scenario],
  );

  const options = useMemo(
    () => (index.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name, "es")),
    [index.data],
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <Header />

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="order-2 min-h-0 w-full overflow-y-auto border-t border-line p-3 lg:order-1 lg:w-[420px] lg:shrink-0 lg:border-r lg:border-t-0">
          <div className="space-y-3 pb-2">
            <SelectBar options={options} value={selected} onChange={setSelected} />

            <PrioritiesCard />
            <ScenarioCard />

            {results.length > 0 && <RankingCard results={results} />}
            {muni.data && <ClimateCard muni={muni.data} />}

            {muni.isLoading && <p className="px-1 text-xs text-muted">{t("loading")}</p>}
            {muni.isError && <p className="px-1 text-xs text-rust">{t("error")}</p>}

            <footer className="space-y-1 px-1 pb-4 pt-2 text-[10px] leading-relaxed text-muted">
              <p>{t("footer.source")}</p>
              <p>{t("footer.disclaimer")}</p>
              <p>{t("footer.independent")}</p>
            </footer>
          </div>
        </aside>

        <div className="relative order-1 h-[44vh] w-full lg:order-2 lg:h-auto lg:flex-1">
          <Suspense
            fallback={
              <div className="grid h-full place-items-center text-xs text-muted">
                {t("loading")}
              </div>
            }
          >
            {geo.data && index.data ? (
              <MapView
                geo={geo.data}
                index={index.data}
                selected={selected}
                onSelect={setSelected}
              />
            ) : (
              <div className="grid h-full place-items-center text-xs text-muted">
                {t("loading")}
              </div>
            )}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
