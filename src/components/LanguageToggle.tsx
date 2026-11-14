import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? "es";
  const next = current === "es" ? "en" : "es";

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      aria-label={next === "en" ? "Switch to English" : "Cambiar a español"}
      title={next === "en" ? "English" : "Español"}
      className="flex h-9 min-w-[4.25rem] items-center justify-center gap-1.5 rounded-full border border-line bg-paper px-3 text-xs font-medium tracking-wide text-ink transition-colors hover:bg-leaf-soft"
    >
      <Languages size={15} strokeWidth={1.75} />
      <span>{current.toUpperCase()}</span>
    </button>
  );
}
