export const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const BASE = import.meta.env.BASE_URL;

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}data/${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const fmt = (value: number, digits = 0, lng = "es") =>
  new Intl.NumberFormat(lng, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
