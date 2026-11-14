import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "../store";
import { Section } from "./Section";

type Hit = { display_name: string; lat: string; lon: string; name?: string };

export function LocationCard() {
  const { t, i18n } = useTranslation();
  const lat = useStore((s) => s.lat);
  const lon = useStore((s) => s.lon);
  const place = useStore((s) => s.place);
  const focusPoint = useStore((s) => s.focusPoint);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const url =
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}` +
          `&accept-language=${i18n.resolvedLanguage ?? "es"}`;
        const res = await fetch(url, { signal: controller.signal });
        const json = (await res.json()) as Hit[];
        setHits(json);
      } catch {
        /* cancelado o error de red */
      } finally {
        setSearching(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [query, i18n.resolvedLanguage]);

  const pick = (hit: Hit) => {
    focusPoint(Number(hit.lat), Number(hit.lon), hit.display_name.split(",").slice(0, 3).join(","));
    setQuery("");
    setHits([]);
  };

  return (
    <Section title={t("location.title")} hint={t("location.hint")}>
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("location.searchPlaceholder")}
          aria-label={t("location.search")}
          className="w-full rounded-xl border border-line bg-bone py-2.5 pl-9 pr-3 text-[13px] text-ink outline-none transition-colors focus:border-leaf"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted">
            …
          </span>
        )}
      </div>

      {query.trim().length >= 3 && hits.length === 0 && !searching && (
        <p className="mt-2 text-[11px] text-muted">{t("location.noResults")}</p>
      )}

      {hits.length > 0 && (
        <ul className="mt-2 space-y-1">
          {hits.map((h, i) => (
            <li key={`${h.lat}-${h.lon}-${i}`}>
              <button
                type="button"
                onClick={() => pick(h)}
                className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[11.5px] leading-snug text-ink transition-colors hover:bg-leaf-soft"
              >
                <MapPin size={12} className="mt-0.5 shrink-0 text-leaf" />
                <span className="line-clamp-2">{h.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 rounded-xl bg-bone px-3 py-2">
        <p className="truncate font-display text-[13px] leading-tight text-ink">
          {place ?? `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`}
        </p>
        <div className="mt-1.5 flex gap-4 text-[10px] text-muted">
          <span>
            {t("location.lat")}: <span className="num text-ink">{lat.toFixed(3)}</span>
          </span>
          <span>
            {t("location.lon")}: <span className="num text-ink">{lon.toFixed(3)}</span>
          </span>
        </div>
      </div>
    </Section>
  );
}
