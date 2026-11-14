import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "../store";
import { Section } from "./Section";

export function ScenarioCard() {
  const { t } = useTranslation();
  const scenario = useStore((s) => s.scenario);
  const setScenario = useStore((s) => s.setScenario);
  const resetScenario = useStore((s) => s.resetScenario);

  const rainLabel = `${scenario.rain > 0 ? "+" : ""}${scenario.rain}%`;
  const tempLabel = `${scenario.temp > 0 ? "+" : ""}${scenario.temp} °C`;

  return (
    <Section
      title={t("scenario.title")}
      action={
        <button
          type="button"
          onClick={resetScenario}
          className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-1 text-[10px] text-muted transition-colors hover:bg-leaf-soft hover:text-leaf"
        >
          <RotateCcw size={11} />
          {t("scenario.reset")}
        </button>
      }
    >
      <div className="space-y-3">
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label htmlFor="scen-rain" className="text-[12px] text-ink">
              {t("scenario.rain")}
            </label>
            <span className="num text-[11px] font-medium text-water">{rainLabel}</span>
          </div>
          <input
            id="scen-rain"
            type="range"
            min={-30}
            max={30}
            step={5}
            value={scenario.rain}
            onChange={(e) => setScenario({ ...scenario, rain: Number(e.target.value) })}
          />
        </div>
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label htmlFor="scen-temp" className="text-[12px] text-ink">
              {t("scenario.temp")}
            </label>
            <span className="num text-[11px] font-medium text-rust">{tempLabel}</span>
          </div>
          <input
            id="scen-temp"
            type="range"
            min={-1}
            max={3}
            step={0.5}
            value={scenario.temp}
            onChange={(e) => setScenario({ ...scenario, temp: Number(e.target.value) })}
          />
        </div>
        <p className="text-[10px] leading-snug text-muted">{t("scenario.note")}</p>
      </div>
    </Section>
  );
}
