import { filterDeals, facets, publicDeal, SORTS, type Sort } from "@/lib/query";
import { getSnapshot } from "@/lib/deals-source";

const CACHE = { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300", "Access-Control-Allow-Origin": "*" };
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const num = (k: string) => { const v = u.get(k); return v != null && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : undefined; };
  const str = (k: string) => u.get(k) || undefined;
  const sort = SORTS.includes(u.get("sort") as Sort) ? (u.get("sort") as Sort) : undefined;
  const snap = await getSnapshot();
  const all = filterDeals(snap.deals, { q: str("q"), category: str("category"), brand: str("brand"), source: str("source"), shop: str("shop"),
    minPrice: num("min_price"), maxPrice: num("max_price"), minDiscount: num("min_discount"), sort });
  const offset = num("offset") ?? 0, limit = Math.min(num("limit") ?? 50, 500);
  return Response.json({ updatedAt: snap.updatedAt, sources: snap.sources, total: all.length, offset, limit,
    facets: facets(snap.deals, snap.sources), campaigns: snap.campaigns, deals: all.slice(offset, offset + limit).map(publicDeal) }, { headers: CACHE });
}
