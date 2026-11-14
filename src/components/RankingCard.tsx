import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Result } from "../engine";
import { Section } from "./Section";

export function RankingCard({ results }: { results: Result[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<string | null>(results[0]?.id ?? null);

  return (
    <Section title={t("ranking.title")} hint={t("ranking.subtitle")}>
      <ol className="space-y-1.5">
        {results.map((r, i) => {
          const isBest = i === 0;
          const expanded = open === r.id;
          return (
            <li
              key={r.id}
              className={`rounded-xl border p-2.5 transition-colors ${
                isBest ? "border-leaf/40 bg-leaf-soft/50" : "border-transparent hover:bg-bone"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : r.id)}
                className="w-full text-left"
                aria-expanded={expanded}
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

              {expanded && r.reasons.length > 0 && (
                <ul className="mt-2 space-y-1 border-l-2 border-leaf/30 pl-2.5">
                  {r.reasons.map((reason) => (
                    <li key={reason.code} className="text-[11px] leading-snug text-muted">
                      {t(`why.${reason.code}`)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
