import type { Deal, SourceInfo } from "./types";
export const SORTS = ["discount", "price_asc", "price_desc", "savings"] as const;
export type Sort = (typeof SORTS)[number];
export type Query = { q?: string; category?: string; brand?: string; source?: string; shop?: string; minPrice?: number; maxPrice?: number; minDiscount?: number; sort?: Sort };
const ALIAS: Record<string, string[]> = {
  headphones: ["audio"], earbuds: ["audio"], phone: ["smartphones"], mobile: ["smartphones"], television: ["tv"], vacuum: ["robot-vacuums"],
  laptop: ["laptops"], macbook: ["laptops"], watch: ["smartwatches"], smartwatch: ["smartwatches"],
};
const hay = (d: Deal) => `${d.title} ${d.brand} ${d.category} ${d.shop ?? ""}`.toLowerCase();
const eq = (a: string | null | undefined, b: string | undefined) => !b || (a ?? "").toLowerCase() === b.toLowerCase();
export function filterDeals(deals: Deal[], o: Query): Deal[] {
  const terms = (o.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const score = (d: Deal) => terms.length === 0 ? 1 : terms.reduce((n, t) => n + (hay(d).includes(t) ? 2 : (ALIAS[t] ?? []).some(a => hay(d).includes(a)) ? 1 : 0), 0);
  const r = deals.map(d => ({ d, s: score(d) })).filter(({ d, s }) => s > 0
    && eq(d.category, o.category) && eq(d.brand, o.brand) && eq(d.source, o.source) && eq(d.shop, o.shop)
    && (o.minPrice == null || d.price >= o.minPrice) && (o.maxPrice == null || d.price <= o.maxPrice)
    && (o.minDiscount == null || d.discountPct >= o.minDiscount));
  const sort = o.sort ?? "discount";
  r.sort((a, b) => (terms.length && b.s !== a.s) ? b.s - a.s
    : sort === "price_asc" ? a.d.price - b.d.price : sort === "price_desc" ? b.d.price - a.d.price
    : sort === "savings" ? (b.d.oldPrice - b.d.price) - (a.d.oldPrice - a.d.price) : b.d.discountPct - a.d.discountPct);
  return r.map(x => x.d);
}
const count = (xs: string[]) => { const m = new Map<string, number>(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return m; };
export function facets(deals: Deal[], sources: SourceInfo[] = []) {
  const prices = deals.map(d => d.price);
  return {
    categories: [...count(deals.map(d => d.category))].sort((x, y) => y[1] - x[1]).map(([key, n]) => ({ key, count: n })),
    brands: [...count(deals.map(d => d.brand))].sort((x, y) => x[0].localeCompare(y[0])).map(([key, n]) => ({ key, count: n })),
    shops: [...count(deals.flatMap(d => (d.shop ? [d.shop] : [])))].sort((x, y) => y[1] - x[1]).map(([key, n]) => ({ key, count: n })),
    sources: sources.map(s => ({ key: s.id, name: s.name, count: deals.filter(d => d.source === s.id).length, status: s.status })),
    minPrice: prices.length ? Math.floor(Math.min(...prices)) : 0, maxPrice: prices.length ? Math.ceil(Math.max(...prices)) : 0,
  };
}
/** Accepts `skroutz:123`, `bestprice:bp_1`, the legacy `sku-123`, or a bare Skroutz sku id. */
export function resolveDeal(deals: Deal[], id: string): Deal | undefined {
  const k = id.trim(); const legacy = k.replace(/^sku-/, "");
  return deals.find(d => d.id === k) ?? deals.find(d => d.id === `skroutz:${legacy}`) ?? deals.find(d => d.nativeId === k);
}
export const publicDeal = (d: Deal) => ({ ...d, currency: "EUR", savings: +(d.oldPrice - d.price).toFixed(2) });
