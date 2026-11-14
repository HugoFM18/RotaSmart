import { useTranslation } from "react-i18next";
import type { SiteData } from "../site";
import { fmt } from "../utils";
import { Section } from "./Section";

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <p className="text-[9.5px] uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="num mt-0.5 font-display text-xl leading-none text-ink">
        {value}
        {unit && <span className="ml-1 font-sans text-[10px] text-muted">{unit}</span>}
      </p>
    </div>
  );
}

function MiniBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-muted">{label}</span>
        <span className="num text-[11px] font-medium text-ink">{Math.round(value * 100)}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full" style={{ width: `${Math.round(value * 100)}%`, background: tone }} />
      </div>
    </div>
  );
}

function ClimateChart({ ppt, t2m, lng }: { ppt: number[]; t2m: number[]; lng: string }) {
  const width = 320;
  const height = 96;
  const maxPpt = Math.max(...ppt, 1);
  const minT = Math.min(...t2m);
  const maxT = Math.max(...t2m);
  const span = Math.max(0.5, maxT - minT);

  const slot = width / 12;
  const barW = slot * 0.52;
  const yT = (v: number) => 56 - ((v - minT) / span) * 34;
  const points = t2m.map((v, i) => `${(i + 0.5) * slot},${yT(v).toFixed(2)}`).join(" ");
  const months = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(lng, { month: "narrow" }).format(new Date(2024, i, 1)),
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-1 w-full" role="img">
      {ppt.map((v, i) => {
        const h = (v / maxPpt) * 46;
        return (
          <rect
            key={i}
            x={i * slot + (slot - barW) / 2}
            y={66 - h}
            width={barW}
            height={Math.max(1, h)}
            rx={2}
            fill="#C9DCE3"
          />
        );
      })}
      <polyline points={points} fill="none" stroke="#C77D13" strokeWidth={1.6} strokeLinejoin="round" />
      {t2m.map((v, i) => (
        <circle key={i} cx={(i + 0.5) * slot} cy={yT(v)} r={1.6} fill="#C77D13" />
      ))}
      <line x1={0} y1={67.5} x2={width} y2={67.5} stroke="#E3E1DA" strokeWidth={1} />
      {months.map((m, i) => (
        <text key={i} x={(i + 0.5) * slot} y={82} textAnchor="middle" fontSize={7} fill="#6B7268">
          {m}
        </text>
      ))}
    </svg>
  );
}

export function SiteCard({ site }: { site: SiteData }) {
  const { t, i18n } = useTranslation();
  const lng = i18n.resolvedLanguage ?? "es";

  const tmax = Math.max(...site.climate.tmax);
  const tmin = Math.min(...site.climate.tmin);

  return (
    <Section
      title={t("site.title")}
      action={
        <span className="rounded-full border border-line px-2 py-0.5 text-[9px] uppercase tracking-wide text-muted">
          {site.soilSource === "soilgrids" ? t("location.soilReal") : t("location.soilEstimated")}
        </span>
      }
    >
      <div className="grid grid-cols-3 gap-x-3 gap-y-4">
        <Stat label={t("site.tmax")} value={fmt(tmax, 1, lng)} unit="°C" />
        <Stat label={t("site.tmin")} value={fmt(tmin, 1, lng)} unit="°C" />
        <Stat label={t("site.rain")} value={fmt(site.annual.ppt, 0, lng)} unit="mm" />
        <Stat label={t("site.et0")} value={fmt(site.annual.et0, 0, lng)} unit="mm" />
        <Stat label={t("site.aridity")} value={fmt(site.annual.aridity, 2, lng)} />
        <Stat label={t("site.tmean")} value={fmt(site.annual.tmean, 1, lng)} unit="°C" />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.1em] text-muted">{t("site.chartTitle")}</p>
          <div className="flex items-center gap-3 text-[9px] text-muted">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-sm bg-[#C9DCE3]" />
              {t("site.legendPpt")}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-harvest" />
              {t("site.legendTemp")}
            </span>
          </div>
        </div>
        <ClimateChart ppt={site.climate.ppt} t2m={site.climate.t2m} lng={lng} />
      </div>

      <div className="mt-3 space-y-2 rounded-xl bg-bone p-3">
        <p className="text-[10px] uppercase tracking-[0.1em] text-muted">{t("site.trendTitle")}</p>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted">{t("site.trendTemp")}</span>
          <span className="num font-medium text-ink">
            {site.trends.t2m > 0 ? "+" : ""}
            {fmt(site.trends.t2m, 2, lng)} °C {t("site.perDecade")}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted">{t("site.trendPpt")}</span>
          <span className="num font-medium text-ink">
            {site.trends.ppt > 0 ? "+" : ""}
            {fmt(site.trends.ppt, 0, lng)} mm {t("site.perDecade")}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        <p className="text-[10px] uppercase tracking-[0.1em] text-muted">{t("site.hazards")}</p>
        <MiniBar label={t("site.drought")} value={site.hazards.drought} tone="#C77D13" />
        <MiniBar label={t("site.heat")} value={site.hazards.heat} tone="#A8432C" />
        <MiniBar label={t("site.erosivity")} value={site.hazards.erosivity} tone="#8B6F47" />
        <MiniBar label={t("site.frost")} value={site.hazards.frost} tone="#3E6E8E" />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[10px] uppercase tracking-[0.1em] text-muted">{t("site.soil")}</p>
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { k: "clay", v: site.soil.clay.toFixed(0) + "%" },
            { k: "sand", v: site.soil.sand.toFixed(0) + "%" },
            { k: "om", v: site.soil.om.toFixed(1) + "%" },
            { k: "ph", v: site.soil.ph.toFixed(1) },
            { k: "cec", v: site.soil.cec.toFixed(0) },
          ].map((s) => (
            <div key={s.k} className="rounded-lg bg-bone px-1.5 py-2 text-center">
              <p className="num text-sm font-medium leading-none text-ink">{s.v}</p>
              <p className="mt-1 text-[8px] uppercase tracking-wide text-muted">{t(`site.${s.k}`)}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
