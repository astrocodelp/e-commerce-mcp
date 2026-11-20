# Adding a deal source

A source is one file that implements `Provider` (`lib/providers/types.ts`) plus one line in `lib/providers/index.ts`.
Everything else is automatic: the hourly cache, per-source fallback snapshots, the `source` and `shop` filters,
the MCP tools, `/api/deals`, the UI badges and the admin status.

```
lib/providers/
  types.ts        Provider contract (read this first)
  index.ts        PROVIDERS registry  ← add your provider here
  skroutz/        OAuth MCP source (official Skroutz Shopping connector)
  bestprice.ts    open MCP source (BestPrice's public server)
lib/mcp-client.ts generic remote-MCP client (bearer token optional, rate-limit aware)
lib/http.ts       mapPool (limited concurrency) + shared user agent
```

## 1. Write the provider

An MCP-backed source (Streamable HTTP):

```ts
// lib/providers/acme.ts
import { McpClient } from "../mcp-client";
import { mapPool } from "../http";
import { oldPriceOf, type Deal } from "../types";
import type { Provider } from "./types";

export const acme: Provider = {
  id: "acme",                 // stable slug: used in deal ids (`acme:<nativeId>`) and the ?source= filter
  name: "Acme",
  kind: "marketplace",        // or "comparison"
  homepage: "https://www.acme.example",
  cart: false,                // true only if agents can fill a cart through Acme's own connector
  // refreshSeconds: 21_600,  // raise for sources with tight rate limits (default 3600)
  // enabled: () => !!process.env.ACME_API_KEY,   // skip the source when credentials are missing
  async fetchDeals({ signal }) {
    const client = new McpClient("https://mcp.acme.example/mcp", { token: process.env.ACME_TOKEN, signal });
    await client.init();
    const rows = await mapPool(["tv", "laptop"], 3, q => client.callJson<any>("search_deals", { query: q }), signal);
    const deals: Deal[] = rows.flatMap(r => r.items.map((x: any): Deal => ({
      id: `acme:${x.id}`, source: "acme", nativeId: String(x.id), title: x.title, brand: x.brand, category: "tv", shop: x.seller ?? null,
      price: x.price, oldPrice: x.was, discountPct: Math.round((1 - x.price / x.was) * 100), baseline: "previous_price",
      url: x.url, imageUrl: x.image ?? null, verify: `Acme MCP: get_offer(id=${x.id})`, fetchedAt: new Date().toISOString(),
    })));
    return { deals };
  },
};
```

A REST API or product-feed source is the same shape: `fetch()` instead of `McpClient`, map rows to `Deal`.

Rules of the contract:
- **Throw on failure.** The cache keeps the last good snapshot and retries in 5 minutes. Throw `RateLimitedError(retryAfterSec)` to back off for as long as the source asks.
- **Respect `signal`.** Stop starting new calls when it aborts and return what you have.
- **Be frugal.** Use `mapPool` with low concurrency. Free tiers have daily caps (see BestPrice below).
- `baseline` says how `oldPrice` was derived: `previous_price` (the merchant's earlier price) or `median_180d` (a reference-price median). Be honest about it; the UI shows it.
- `shop` is the actual retailer when the source knows it (shows up in the Shop filter).
- Optional `seed()` returns bundled deals to show (labelled "sample") before the first successful refresh.

## 2. Register it

```ts
// lib/providers/index.ts
export const PROVIDERS: Provider[] = [skroutz, bestprice, acme];
```

Restrict at runtime with `SOURCES=skroutz,bestprice` if you want to turn sources off without code changes.

## 3. Test it

Call `provider.fetchDeals({ signal: new AbortController().signal })` from a script, or point it at a local fake server
(the test in this repo's history replays BestPrice's real response shapes, including 429s). Then `npm run build` and open the admin page to see the source's status.

## Where other marketplaces stand (checked 2026-11-20)

| Source | Buyer-side MCP? | Status here |
| --- | --- | --- |
| **Skroutz** | Yes: official *Skroutz Shopping* connector (OAuth per account) | Integrated. Can fill carts. |
| **BestPrice** (bestprice.gr) | Yes: official public MCP at `mcp.bestprice.gr/mcp`, read-only, no key. Free tier caps *unidentified* clients per day; contact feedback@bestprice.gr for data access | Integrated, with a small call budget and 6h refresh. Its offers list Greek shops such as **Kotsovolos** and **Public**, which surface as the deal's `shop`. |
| **Amazon** | No official MCP found. Third-party only: e.g. Canopy API's MCP (API key, has a deals tool), Apify actors, browser-automation scrapers | Not integrated. The legitimate routes are a paid data API behind a key (a REST/MCP provider like the template above) or Amazon's own affiliate API with an Associates account. Avoid scraping (terms of service). Check which Amazon storefront actually ships to Greece. |
| **Kotsovolos**, **Plaisio** | No MCP found | Reachable today through BestPrice offers. A direct source would need an affiliate/product feed or partnership. |
| **Public.gr** | No buyer-side MCP found; seller-side API only (third-party wrappers exist for orders/stock) | Reachable through BestPrice offers. |

"Easy to build" here means: if a retailer or aggregator exposes an MCP, a REST API or a product feed, it is one provider file (about 40 lines). If it only has a website, it is a scraping job, which this project does not do.
