import { McpClient, McpRateLimitError } from "../mcp-client";
import { mapPool } from "../http";
import { slug, type Deal } from "../types";
import { RateLimitedError, type Provider } from "./types";

export const MCP_URL = process.env.BESTPRICE_MCP_URL ?? "https://mcp.bestprice.gr/mcp";
// BestPrice's free tier caps unidentified clients per day, so this provider is deliberately frugal:
// about 55 calls per refresh and one refresh per BESTPRICE_REFRESH_SECONDS (default 6h). For hourly data,
// ask BestPrice for data access (feedback@bestprice.gr) and set BESTPRICE_REFRESH_SECONDS=3600.
const QUERIES = ["smartphone", "ακουστικά bluetooth", "smart tv oled", "laptop", "smartwatch", "tablet", "gaming monitor", "πλυντήριο ρούχων", "ρομποτική σκούπα", "ssd"];
const MAX_PRODUCTS = 40;      // price-history lookups per refresh
const MAX_OFFER_LOOKUPS = 12; // merchant lookups for the best deals
const MIN_DISCOUNT = 3;       // % below the 180-day median to count as a deal
const MIN_PRICE = 15;         // below this, medians are too noisy to call it a deal
const CLIENT = { "x-mcp-client-name": "blackfriday-mcp" }; // BestPrice asks clients to identify themselves

// BestPrice category title -> our category slug (Greek or English titles); unmatched titles fall back to their slug.
const CATEGORY_RULES: [RegExp, string][] = [
  [/θήκ|case|cover|προστατευτικ|φορτιστ|καλώδ/i, "accessories"], [/smartwatch|έξυπνα ρολόγια|watch/i, "smartwatches"], [/κινητ|smartphone|mobile phone/i, "smartphones"],
  [/headphone|ακουστικ|earbud|handsfree|ηχεί|speaker/i, "audio"], [/τηλεοράσ|\btv\b|television/i, "tv"], [/laptop|notebook|φορητ/i, "laptops"], [/tablet/i, "tablets"],
  [/οθόν|monitor/i, "monitors"], [/πλυντήρ|ψυγεί|washing|fridge|refrigerat|κλιματιστ|air condition|φούρν|dishwasher/i, "appliances"], [/σκούπ|vacuum/i, "robot-vacuums"],
  [/ssd|σκληρ|storage|δίσκ/i, "storage"], [/air ?fryer|καφετιέρ|coffee|espresso|κουζιν|μίξερ|blender/i, "kitchen"], [/κονσόλ|console|playstation|xbox|nintendo|gaming/i, "gaming"], [/κάμερ|camera/i, "cameras"],
  [/μαλλι|hair|beauty|περιποίηση/i, "beauty"],
];
const categoryOf = (title: string) => CATEGORY_RULES.find(([re]) => re.test(title))?.[1] ?? (slug(title) || "other");

type SearchResult = { products?: { product_id: string; title: string; brand?: string | null; category_title?: string; price_from?: number; availability?: string; bestprice_url?: string; image_url?: string | null }[] };
type History = { current_price?: number; price_delta_vs_180d_median_pct?: number; deal_classification?: string; window_stats?: { days: number; median_price: number; minimum_price: number; observations: number }[] };
type Offers = { offers?: { merchant_name?: string | null; item_price?: number; availability?: string }[] };

/**
 * BestPrice (bestprice.gr): official, keyless, read-only MCP that compares offers across Greek shops (this is how
 * shops like Plaisio, Kotsovolos or Public show up, as the `shop` of a deal). BestPrice has no "deals" list, so
 * we search, then use its 180-day price history to keep only products priced below their median, and use that
 * median as the "was" price (baseline `median_180d`, an honest reference rather than a merchant-claimed one).
 * No cart tool: agents hand the link to the human.
 */
export const bestprice: Provider = {
  id: "bestprice", name: "BestPrice", kind: "comparison", homepage: "https://www.bestprice.gr", cart: false, minDeals: 5, timeoutMs: 50_000,
  refreshSeconds: Number(process.env.BESTPRICE_REFRESH_SECONDS) || 21_600,
  async fetchDeals({ signal }) {
    // One controller so the first 429 stops every in-flight and queued call immediately.
    const stop = new AbortController(); const sig = AbortSignal.any([signal, stop.signal]);
    let limited: McpRateLimitError | null = null;
    const client = new McpClient(MCP_URL, { signal: sig, headers: CLIENT });
    const guard = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try { return await fn(); }
      catch (e) { if (e instanceof McpRateLimitError) { limited = e; stop.abort(); } return undefined; } // any other error: skip this one item
    };
    await client.init();

    const found = new Map<string, NonNullable<SearchResult["products"]>[number]>();
    await mapPool(QUERIES, 3, q => guard(async () => {
      for (const p of (await client.callJson<SearchResult>("search_products", { query: q, limit: 8 })).products ?? []) if (p.price_from && p.price_from >= MIN_PRICE && p.availability === "available") found.set(p.product_id, p);
    }), sig);
    if (limited) throw new RateLimitedError((limited as McpRateLimitError).retryAfterSec, "BestPrice rate limit");
    if (!found.size) throw new Error("no products found");

    const now = new Date().toISOString();
    const scored = (await mapPool([...found.values()].slice(0, MAX_PRODUCTS), 3, p => guard(async () => {
      const h = await client.callJson<History>("get_price_history", { product_id: p.product_id, period_days: 30 });
      const w = h.window_stats?.find(x => x.days === 180); const price = h.current_price ?? p.price_from!;
      if (!w || w.observations < 25 || !w.median_price || price >= w.median_price) return undefined;
      const pct = Math.round((1 - price / w.median_price) * 100);
      return pct >= MIN_DISCOUNT && pct <= 70 ? { p, price, median: w.median_price, pct } : undefined;
    }), sig)).sort((a, b) => b.pct - a.pct);
    if (limited && !scored.length) throw new RateLimitedError((limited as McpRateLimitError).retryAfterSec, "BestPrice rate limit");

    const shops = new Map<string, string>();
    if (!limited) await mapPool(scored.slice(0, MAX_OFFER_LOOKUPS), 3, s => guard(async () => {
      const o = await client.callJson<Offers>("compare_offers", { product_id: s.p.product_id, in_stock_only: true, limit: 3 });
      const best = (o.offers ?? []).filter(x => x.merchant_name && x.item_price).sort((a, b) => a.item_price! - b.item_price!)[0];
      if (best?.merchant_name) shops.set(s.p.product_id, best.merchant_name);
    }), sig);

    const deals: Deal[] = scored.map(({ p, price, median, pct }) => ({
      id: `bestprice:${p.product_id}`, source: "bestprice", nativeId: p.product_id, title: p.title, brand: p.brand || p.title.split(" ")[0], category: categoryOf(p.category_title ?? ""),
      shop: shops.get(p.product_id) ?? null, price, oldPrice: Math.round(median * 100) / 100, discountPct: pct, baseline: "median_180d" as const,
      url: p.bestprice_url ?? "https://www.bestprice.gr", imageUrl: p.image_url ?? null,
      verify: `BestPrice MCP: compare_offers(product_id="${p.product_id}") and get_price_history; no cart tool, hand the link to the user`, fetchedAt: now,
    })).filter(d => d.category !== "accessories");
    return { deals };
  },
};
