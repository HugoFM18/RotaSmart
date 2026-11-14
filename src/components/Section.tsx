import type { ReactNode } from "react";

export function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            {title}
          </h2>
          {hint && <p className="mt-1 text-[11px] leading-snug text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
