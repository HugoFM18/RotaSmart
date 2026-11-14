import { useTranslation } from "react-i18next";
import { useStore } from "../store";
import type { CropId } from "../engine";
import { Section } from "./Section";

const CROP_IDS: CropId[] = [
  "maiz",
  "frijol",
  "yuca",
  "sorgo",
  "cafe",
  "platano",
  "arroz",
  "cacao",
  "pastura",
  "cobertura",
];

export function CropSelect() {
  const { t } = useTranslation();
  const crop = useStore((s) => s.crop);
  const setCrop = useStore((s) => s.setCrop);

  return (
    <Section title={t("crop.title")} hint={t("crop.hint")}>
      <div className="grid grid-cols-2 gap-1.5">
        {CROP_IDS.map((id) => {
          const active = crop === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setCrop(id)}
              aria-pressed={active}
              className={`rounded-xl border px-2.5 py-2 text-left text-[12px] transition-colors ${
                active
                  ? "border-leaf bg-leaf text-bone"
                  : "border-line bg-bone text-ink hover:border-leaf/40 hover:bg-leaf-soft"
              }`}
            >
              {t(`crops.${id}`)}
            </button>
          );
        })}
      </div>
    </Section>
  );
}
