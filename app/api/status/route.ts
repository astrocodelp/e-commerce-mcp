import { getSnapshot } from "@/lib/deals-source";
import { overall } from "@/lib/types";
export async function GET(req: Request) {
  new URL(req.url); // request-time route
  const s = await getSnapshot();
  return Response.json({ status: overall(s.sources), updatedAt: s.updatedAt, deals: s.deals.length, ageSeconds: Math.round((Date.now() - Date.parse(s.updatedAt)) / 1000), sources: s.sources },
    { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60", "Access-Control-Allow-Origin": "*" } });
}
