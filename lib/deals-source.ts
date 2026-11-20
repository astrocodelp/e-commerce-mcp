import { cacheLife, cacheTag } from "next/cache";
import { enabledProviders, getProvider } from "./providers";
import { skroutzUrl } from "./providers/skroutz/parse";
import { RateLimitedError } from "./providers/types";
import { readProviderBlob, writeProviderBlob } from "./store";
import type { ProviderSnapshot, Snapshot, SourceInfo } from "./types";

/**
 * One provider's deals, cached on its own with Cache Components (`"use cache"`).
 *
 * The first request runs the live fetch, then the result is served from cache for an hour. After that the next
 * request gets the cached copy instantly while a fresh one is built in the background (ISR-style
 * stale-while-revalidate, the `deals` profile in next.config.ts). If a refresh fails we fall back to the last
 * good snapshot (or the provider's bundled seed) and retry within minutes instead of waiting an hour.
 * Providers are cached independently, so a slow or broken source never blocks or hides the others.
 */
async function providerSnapshot(id: string): Promise<ProviderSnapshot> {
  "use cache";
  cacheTag("deals", `deals:${id}`);
  const p = getProvider(id);
  if (!p) return { updatedAt: new Date().toISOString(), deals: [], campaigns: [], status: "error" };
  try {
    const data = await p.fetchDeals({ signal: AbortSignal.timeout(p.timeoutMs ?? 45_000) });
    if (data.deals.length >= (p.minDeals ?? 5)) {
      const every = p.refreshSeconds ?? 3600;
      if (every === 3600) cacheLife("deals"); else cacheLife({ stale: 300, revalidate: every, expire: Math.max(86400, every * 2) });
      const live = { updatedAt: new Date().toISOString(), deals: data.deals, campaigns: data.campaigns ?? [] };
      await writeProviderBlob(id, live).catch(() => {});
      return { ...live, status: "live" };
    }
    console.warn(`[deals:${id}] only ${data.deals.length} deals, keeping the previous snapshot`);
  } catch (e) {
    console.warn(`[deals:${id}] refresh failed:`, e instanceof Error ? e.message : e);
    // Rate limited: back off for as long as the source asks (capped at 6h). Other failures retry in 5 minutes.
    if (e instanceof RateLimitedError) cacheLife({ stale: 60, revalidate: Math.min(Math.max(e.retryAfterSec, 600), 21600), expire: 86400 });
    else cacheLife({ stale: 30, revalidate: 300, expire: 3600 });
    return fallback(id);
  }
  cacheLife({ stale: 30, revalidate: 300, expire: 3600 });
  return fallback(id);
}

async function fallback(id: string): Promise<ProviderSnapshot> {
  const p = getProvider(id)!;
  const last = await readProviderBlob(id);
  if (last) return { ...last, campaigns: last.campaigns ?? [], status: "cached" };
  const seed = p.seed?.();
  return seed ? { ...seed, campaigns: seed.campaigns ?? [], status: "sample" } : { updatedAt: new Date().toISOString(), deals: [], campaigns: [], status: "error" };
}

/** Every enabled source merged into one snapshot, with a per-source status. */
export async function getSnapshot(): Promise<Snapshot> {
  const providers = enabledProviders();
  const parts = await Promise.all(providers.map(p => providerSnapshot(p.id)));
  const sources: SourceInfo[] = providers.map((p, i) => ({ id: p.id, name: p.name, kind: p.kind, homepage: p.homepage, cart: p.cart, status: parts[i].status, count: parts[i].deals.length, updatedAt: parts[i].deals.length ? parts[i].updatedAt : null }));
  const stamps = parts.filter(x => x.deals.length).map(x => Date.parse(x.updatedAt));
  return { updatedAt: new Date(stamps.length ? Math.max(...stamps) : 0).toISOString(), deals: parts.flatMap(x => x.deals).map(deal => deal.source === "skroutz"
    ? { ...deal, url: skroutzUrl(deal.nativeId, deal.title, deal.url) }
    : deal), campaigns: parts.flatMap(x => x.campaigns), sources };
}
