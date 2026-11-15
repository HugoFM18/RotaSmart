import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CropId, Result } from "../engine";
import { GUIDANCE_LINES, ROTATION_REFERENCES } from "../rotation-guidance";
import { Section } from "./Section";

export function RankingCard({ results, crop }: { results: Result[]; crop: CropId }) {
  const { t } = useTranslation();
  const cropName = t(`crops.${crop}`);
  // Resolve the default from the current ranking when location/priorities change.
  const [selection, setSelection] = useState<{ id: string | null; results: Result[] } | null>(null);
  const open = selection?.results === results ? selection.id : results[0]?.id ?? null;

  return (
    <Section title={t("ranking.title")} hint={t("ranking.subtitle", { crop: cropName })}>
      {results.length === 0 && <p className="rounded-xl bg-bone p-3 text-[12px] leading-relaxed text-muted">{t("ranking.unavailable", { crop: cropName })}</p>}
      <ol className="space-y-1.5">
        {results.map((r, i) => {
          const isBest = i === 0;
          const expanded = open === r.id;
          const reference = ROTATION_REFERENCES[r.id];
          return (
            <li
              key={r.id}
              className={`rounded-xl border p-2.5 transition-colors ${
                isBest ? "border-leaf/40 bg-leaf-soft/50" : "border-transparent hover:bg-bone"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelection({ id: expanded ? null : r.id, results })}
                className="w-full text-left"
                aria-expanded={expanded}
                aria-controls={`rotation-guidance-${r.id}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="num w-4 text-[11px] text-muted">{i + 1}</span>
                  <span className="flex-1 text-[12.5px] font-medium leading-tight text-ink">
                    {t(`rotations.${r.id}`)}
                  </span>
                  <span className="num font-display text-base leading-none text-ink">
                    {Math.round(r.total)}
                  </span>
                  <ChevronDown
                    size={13}
                    className={`text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full transition-[width] duration-200"
                    style={{
                      width: `${Math.round(r.total)}%`,
                      background: isBest ? "#2F6B4F" : "#A9BDB1",
                    }}
                  />
                </div>
              </button>

              {isBest && (
                <p className="mt-1.5 inline-block rounded-full bg-leaf px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-bone">
                  {t("ranking.best")}
                </p>
              )}

              <div id={`rotation-guidance-${r.id}`} hidden={!expanded}>
                {reference && (
                  <div className="mt-2 space-y-1.5 border-l-2 border-leaf/30 pl-2.5 text-[11px] leading-relaxed text-muted">
                    {GUIDANCE_LINES.map(line => (
                      <p key={line}>{t(`rotationGuidance.${r.id}.${line}`)}</p>
                    ))}
                    <p className="border-t border-leaf/15 pt-1.5">
                      <span>{t("ranking.source")} </span>
                      <a
                        href={reference.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("ranking.openSource", { source: reference.label })}
                        className="rounded-sm font-medium text-leaf underline decoration-leaf/40 underline-offset-2 hover:decoration-leaf focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                      >
                        {reference.label}<span aria-hidden="true"> ↗</span>
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
