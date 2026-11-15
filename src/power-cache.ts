/** Only validated historical NASA responses are stored; unavailable storage is harmless. */
export type PowerParameters = Record<string, Record<string, number>>;
const CACHE = "rotasmart-power-2005-2024-v1";
const TTL = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 32;

export async function readPowerCache(url: string, validate: (data: PowerParameters) => void): Promise<PowerParameters | null> {
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open(CACHE);
    const response = await cache.match(url);
    if (!response) return null;
    try {
      const saved = await response.json();
      if (!Number.isFinite(saved.savedAt) || Date.now() - saved.savedAt > TTL) throw new Error("Expired NASA cache");
      validate(saved.data);
      return saved.data;
    } catch { await cache.delete(url); return null; }
  } catch { return null; }
}

export function writePowerCache(url: string, data: PowerParameters): void {
  if (typeof caches === "undefined") return;
  // The result is displayed before disk writes complete.
  void (async () => {
    const cache = await caches.open(CACHE);
    await cache.put(url, new Response(JSON.stringify({ savedAt: Date.now(), data }), { headers: { "Content-Type": "application/json" } }));
    const keys = await cache.keys();
    await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)).map(key => cache.delete(key)));
  })().catch(() => { /* Private browsing or a full cache must not block the analysis. */ });
}
