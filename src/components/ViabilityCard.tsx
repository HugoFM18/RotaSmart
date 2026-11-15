import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Viability } from "../engine";
import { Section } from "./Section";

const VERDICT_STYLE: Record<Viability["verdict"], string> = {
  high: "bg-leaf text-bone",
  medium: "bg-harvest text-bone",
  low: "bg-[#B96A20] text-bone",
  none: "bg-rust text-bone",
  unavailable: "bg-muted text-bone",
};

const STATUS_COLOR: Record<string, string> = {
  ok: "#2F6B4F",
  warn: "#C77D13",
  bad: "#A8432C",
};

export function ViabilityCard({ viability, soilPending = false }: { viability: Viability; soilPending?: boolean }) {
  const { t, i18n } = useTranslation();
  const season = viability.season;
  const month = (index: number) => new Intl.DateTimeFormat(i18n.resolvedLanguage ?? "es", { month: "short" }).format(new Date(2024, index % 12, 1));

  return (
    <Section title={t("viability.title")}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.1em] text-muted">
            {t("viability.score")}
          </p>
          <p className="num font-display text-4xl leading-none text-ink">
            {viability.verdict === "unavailable" ? "—" : Math.round(viability.total)}
            <span className="ml-1 text-sm font-sans text-muted">/100</span>
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${VERDICT_STYLE[viability.verdict]}`}
        >
          {t(`viability.verdict.${viability.verdict}`)}
        </span>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">{t("viability.basis")}</p>
      {soilPending && <p role="status" className="mt-1 text-[11px] leading-relaxed text-harvest">{t("viability.soilPending")}</p>}
      {season && <p className="mt-1 text-[11px] text-muted">{t("viability.season", { from: month(season.start), to: month(season.start + season.months - 1) })}</p>}

      <div className="mt-4 space-y-2.5">
        {viability.factors.map((f) => (
          <div key={f.key}>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-muted">
                {t(`viability.factors.${f.key}`)}
              </span>
              <span className="num text-[11px] font-medium text-ink">
                {Math.round(f.score)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full transition-[width] duration-200"
                style={{
                  width: `${Math.round(f.score)}%`,
                  background: STATUS_COLOR[f.status],
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {viability.limits.length > 0 && (
        <div className="mt-4 rounded-xl bg-bone p-3">
          <p className="mb-1.5 text-[10px] uppercase tracking-[0.1em] text-muted">
            {t("viability.limits")}
          </p>
          <ul className="space-y-1.5">
            {viability.limits.map((l) => (
              <li key={l.code} className="flex items-start gap-1.5 text-[11px] leading-snug text-ink">
                <AlertTriangle size={12} className="mt-0.5 shrink-0 text-harvest" />
                <span>{t(`limits.${l.code}`, { months: l.value })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}
