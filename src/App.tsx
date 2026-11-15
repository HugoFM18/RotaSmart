import { lazy, Suspense, useEffect, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Header } from "./components/Header";
import { LocationCard } from "./components/LocationCard";
import { CropSelect } from "./components/CropSelect";
import { ViabilityCard } from "./components/ViabilityCard";
import { SiteCard } from "./components/SiteCard";
import { PrioritiesCard } from "./components/PrioritiesCard";
import { ScenarioCard } from "./components/ScenarioCard";
import { RankingCard } from "./components/RankingCard";
import { MapErrorBoundary } from "./components/MapErrorBoundary";
import { useStore } from "./store";
import { evaluateAll, evaluateCrop } from "./engine";
import { fetchSite, fetchPlace } from "./site";

const GlobeView = lazy(() =>
  import("./components/GlobeView").then((m) => ({ default: m.GlobeView })),
);

export default function App() {
  const { t, i18n } = useTranslation();
  const lat = useStore((s) => s.lat);
  const lon = useStore((s) => s.lon);
  const crop = useStore((s) => s.crop);
  const priorities = useStore((s) => s.priorities);
  const scenario = useStore((s) => s.scenario);
  const setPlace = useStore((s) => s.setPlace);

  const siteQuery = useQuery({
    queryKey: ["site", lat.toFixed(3), lon.toFixed(3)],
    queryFn: () => fetchSite(lat, lon),
    staleTime: 60 * 60 * 1000,
    retry: 1,
    placeholderData: keepPreviousData,
  });

  const placeQuery = useQuery({
    queryKey: ["place", lat.toFixed(3), lon.toFixed(3), i18n.resolvedLanguage],
    queryFn: () => fetchPlace(lat, lon, i18n.resolvedLanguage ?? "es"),
    staleTime: Infinity,
  });

  useEffect(() => {
    const current = useStore.getState();
    // A background geocoder must not replace the selected administrative area's name.
    if (placeQuery.data && current.areaStatus === "idle" && current.lat === lat && current.lon === lon) setPlace(placeQuery.data);
  }, [placeQuery.data, setPlace, lat, lon]);

  const site = siteQuery.data;

  const viability = useMemo(
    () => (site ? evaluateCrop(crop, site, scenario) : null),
    [site, crop, scenario],
  );

  const rotations = useMemo(
    () => (site ? evaluateAll(site, priorities, scenario) : []),
    [site, priorities, scenario],
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <Header />

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="order-2 min-h-0 w-full flex-1 overflow-y-auto border-t border-line p-3 lg:order-1 lg:w-[420px] lg:flex-none lg:border-r lg:border-t-0">
          <div className="space-y-3 pb-2">
            <LocationCard />
            <CropSelect />

            {viability && <ViabilityCard viability={viability} />}

            {siteQuery.isLoading && !site && (
              <p className="px-1 py-6 text-center text-xs text-muted">{t("loading")}</p>
            )}
            {siteQuery.isError && (
              <p className="rounded-xl border border-rust/30 bg-rust/5 px-3 py-2 text-[11px] text-rust">
                {t("error")}
              </p>
            )}

            {site && <SiteCard site={site} />}

            <PrioritiesCard />
            <ScenarioCard />

            {rotations.length > 0 && <RankingCard results={rotations} />}

            <footer className="space-y-1 px-1 pb-4 pt-2 text-[10px] leading-relaxed text-muted">
              <p>{t("footer.source")}</p>
              <p>{t("footer.disclaimer")}</p>
              <p>{t("footer.independent")}</p>
            </footer>
          </div>
        </aside>

        <div className="relative order-1 h-[46vh] w-full shrink-0 lg:order-2 lg:h-auto lg:flex-1">
          <MapErrorBoundary
            fallback={
              <div className="grid h-full place-items-center bg-[#0B1220] px-6 text-center text-xs text-white/70">
                {t("error")}
              </div>
            }
          >
            <Suspense
              fallback={
                <div className="grid h-full place-items-center bg-[#0B1220] text-xs text-white/60">
                  {t("loading")}
                </div>
              }
            >
              <GlobeView />
            </Suspense>
          </MapErrorBoundary>
        </div>
      </main>
    </div>
  );
}
