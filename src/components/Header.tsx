import { Sprout } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "./LanguageToggle";

export function Header() {
  const { t } = useTranslation();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-bone/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-leaf">
          <Sprout size={18} className="text-bone" strokeWidth={2} />
        </div>
        <div>
          <h1 className="font-display text-lg leading-none tracking-tight">
            {t("app.name")}
          </h1>
          <p className="mt-1 text-[11px] leading-none text-muted">{t("app.tagline")}</p>
        </div>
      </div>

      <span className="ml-2 hidden rounded-full border border-line px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-muted md:inline-block">
        {t("header.challenge")}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full bg-leaf-soft px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-leaf sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
          {t("header.badge")}
        </span>
        <LanguageToggle />
      </div>
    </header>
  );
}
