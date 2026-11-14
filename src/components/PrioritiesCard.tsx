import { useTranslation } from "react-i18next";
import { useStore } from "../store";
import type { Priorities } from "../engine";
import { Section } from "./Section";

const KEYS: (keyof Priorities)[] = ["water", "income", "risk", "soil", "labor"];

export function PrioritiesCard() {
  const { t } = useTranslation();
  const priorities = useStore((s) => s.priorities);
  const setPriority = useStore((s) => s.setPriority);

  return (
    <Section title={t("priorities.title")} hint={t("priorities.hint")}>
      <div className="space-y-3">
        {KEYS.map((key) => (
          <div key={key}>
            <div className="mb-1 flex items-baseline justify-between">
              <label htmlFor={`prio-${key}`} className="text-[12px] text-ink">
                {t(`priorities.${key}`)}
              </label>
              <span className="num text-[11px] font-medium text-muted">{priorities[key]}</span>
            </div>
            <input
              id={`prio-${key}`}
              type="range"
              min={0}
              max={100}
              step={5}
              value={priorities[key]}
              onChange={(e) => setPriority(key, Number(e.target.value))}
            />
          </div>
        ))}
      </div>
    </Section>
  );
}
