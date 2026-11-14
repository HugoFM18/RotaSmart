import { useTranslation } from "react-i18next";

export function SelectBar({
  options,
  value,
  onChange,
}: {
  options: { id: string; name: string }[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-line bg-paper p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <label
          htmlFor="muni-select"
          className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted"
        >
          {t("select.label")}
        </label>
        <span className="text-[10px] text-muted">{t("select.count")}</span>
      </div>
      <select
        id="muni-select"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-line bg-bone px-3 py-2.5 font-display text-base text-ink outline-none transition-colors focus:border-leaf"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
