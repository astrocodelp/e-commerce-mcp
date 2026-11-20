# Black Friday MCP

An agent-first Black Friday deal feed for shoppers in Greece, served as a **remote MCP server** with `llms.txt`, copy-ready prompts and a fast web UI.

Agents discover and filter deals here, verify prices and build the cart with Skroutz's own **Skroutz Shopping** MCP connector, and the human does the paying. Nothing in this project can make a purchase.

> Independent project, not affiliated with or endorsed by Skroutz. Deal prices can change. Confirm the current price and delivery costs at the source before paying.

## Sources

Each source is one small file. Today:

| Source | How | Notes |
| --- | --- | --- |
| **Skroutz** | official *Skroutz Shopping* MCP connector (OAuth, one-time local sign-in) | agents can fill a Skroutz cart |
| **BestPrice** | official open MCP (`mcp.bestprice.gr`), read-only | compares Greek shops (Kotsovolos, Public, ...); shown as each deal's `shop`; "was" price is the 180-day median |
| **eBay** | official [Browse API](https://developer.ebay.com/develop/api/buy/browse_api), read-only | optional international source via eBay Germany, for discounted new items in EUR deliverable to Greece |

Adding another marketplace is a new provider file plus one line in a registry. See **[docs/ADDING_A_SOURCE.md](docs/ADDING_A_SOURCE.md)**, which also records which Greek and global marketplaces have MCPs today.

## How it works

The app itself fetches fresh prices from every source and caches them. No cron job, no external routine: it is plain Next.js 16 [Cache Components](https://nextjs.org/docs/app/getting-started/caching) with ISR-style revalidation.

```
lib/providers/*        one Provider per source (fetchDeals → Deal[])
lib/deals-source.ts    providerSnapshot(id): "use cache" + cacheLife + cacheTag, one cache entry per source
                       getSnapshot(): merges all enabled sources (+ per-source status)
/            web UI (static shell, rebuilt in the background when a source's cache goes stale)
/api/deals   JSON + filters      /api/mcp   MCP server      /llms.txt   agent docs
```

- **Cache lifetime** (`next.config.ts`): `deals: { stale: 300, revalidate: 3600, expire: 86400 }`. After an hour the next request is served the cached prices instantly while a fresh fetch runs in the background. A source can set its own `refreshSeconds` (BestPrice uses 6h to stay inside its free tier).
- **Independent sources**: each source is cached on its own, so a slow, broken or rate-limited source never blocks or hides the others.
- **Failure handling**: a failed refresh serves the last good snapshot (or bundled sample data), labelled *cached* / *sample*, and retries in 5 minutes. A `429` backs off for the `Retry-After` the source sent (capped at 6h).
- The page, the JSON API and the MCP tools read the same cached functions, so they always agree.

## MCP tools (read-only)

| Tool | Purpose |
| --- | --- |
| `search_deals` | Filter by `query`, `category`, `brand`, `source`, `shop`, `min_price`, `max_price`, `min_discount`; sort by `discount`, `price_asc`, `price_desc`, `savings` |
| `get_deal`, `compare_deals` | Look up or compare deals by id (`skroutz:60478236`, `bestprice:bp_…`); works across sources |
| `list_sources`, `list_categories`, `list_brands`, `list_shops`, `list_campaigns` | Facets, source status (live / cached / sample, can it fill a cart) and campaigns |
| `get_freshness` | When prices were last fetched, per source |
| `build_shopping_plan` | Best deal per wishlist item within a budget, plus how to verify and buy each |
| `show_basket` | Renders a basket / cart UI (images, totals, add-to-Skroutz-cart and go-to-cart buttons). Never buys |
| `get_agent_instructions` | Recommended system prompt |

Endpoint: `/api/mcp` (Streamable HTTP, no auth). Also: `/llms.txt`, `/llms-full.txt`, `/.well-known/mcp.json`, `/api/deals`, `/api/status`.

```bash
claude mcp add --transport http blackfriday https://<your-site>/api/mcp
claude mcp add --transport http skroutz https://api.skroutz.gr/api/agents/mcp/shopping
```

## MCP App UI

`search_deals`, `get_deal`, `compare_deals`, `build_shopping_plan` and `show_basket` also return structured data and point at a widget (`ui://blackfriday/deals.html`, source in `lib/ui/widget.ts`). Hosts that support [MCP Apps](https://modelcontextprotocol.io/extensions/apps) render product cards with images, source and category filters for the displayed results, sorting, a basket and a cart view. Other clients just get JSON.

The widget never buys and cannot touch the user's real cart (that needs the user's own sign-in). Its **Add to Skroutz cart** button asks the assistant to run the Skroutz Shopping connector's `add_to_cart`; the assistant then calls `show_basket` with the returned `cart_url`, and the widget shows **Go to Skroutz cart & pay**. Links and images are host-allowlisted (Skroutz, BestPrice) and everything is rendered with `textContent`.

## Run your own

### 1. Deploy

1. Import the repo into Vercel as a Next.js project.
2. Add a **Blob** store and connect it to the project (sets `BLOB_READ_WRITE_TOKEN`).
3. Add `ADMIN_SECRET` as a **Sensitive** env var: `openssl rand -hex 24`.

Until step 2 is done the Skroutz source shows bundled sample data; BestPrice needs no setup.

### 2. Connect Skroutz (one time)

Skroutz's connector uses OAuth for each account, so the server needs a refresh token once. Run this **on your own machine**:

```bash
node scripts/skroutz-auth.mjs
```

It registers an OAuth client, opens the Skroutz sign-in, and prints three values. Add them to Vercel as **Sensitive** env vars and redeploy:

```
SKROUTZ_CLIENT_ID=...
SKROUTZ_CLIENT_SECRET=...
SKROUTZ_REFRESH_TOKEN=...
```

Nothing is written to disk and nothing should ever be committed.

### Environment variables

| Name | What it is |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (last good snapshot + encrypted tokens) |
| `ADMIN_SECRET` | Password for the `/admin` refresh form and the key that encrypts stored tokens |
| `SKROUTZ_CLIENT_ID`, `SKROUTZ_CLIENT_SECRET`, `SKROUTZ_REFRESH_TOKEN` | From `scripts/skroutz-auth.mjs` (Skroutz source) |
| `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` | Production App ID and Cert ID with [approved eBay Buy API access](https://developer.ebay.com/api-docs/buy/buy-requirements.html#production); eBay is enabled when both are set |
| `SOURCES` | Optional comma list to restrict which sources run, e.g. `skroutz,bestprice,ebay` |
| `BESTPRICE_REFRESH_SECONDS` | Optional, default `21600` (6h). Lower it only if BestPrice has granted you data access |

`.env*` is git-ignored; only `.env.example` (empty values) is tracked.

### Security notes

- **Use a dedicated Skroutz account.** The Skroutz connector's scope also covers carts, orders and addresses. This app only ever calls `search_deals` (see `lib/providers/skroutz/index.ts`), but the token itself is powerful, so don't use your personal account.
- **BestPrice rate limits.** Its free tier caps unidentified clients per day (HTTP 429). The provider identifies itself, spends about 55 calls per refresh and refreshes every 6h. For hourly data contact feedback@bestprice.gr.
- Skroutz rotates refresh tokens; the newest one is stored AES-256-GCM encrypted (key derived from `ADMIN_SECRET`) under an unguessable Blob path. Rotating `ADMIN_SECRET` means re-running the sign-in script.
- `POST /api/refresh` (Bearer `ADMIN_SECRET`, or the form on `/admin`) forces a rebuild on the next request. The hourly refresh is request-driven; to guarantee it without traffic, call that endpoint from any scheduler.

## Design notes

The UI follows Emil Kowalski's design-engineering principles: strong ease-out curves, 150–250ms transitions on transform and opacity only, press feedback on buttons, hover effects gated to hover-capable devices, and `prefers-reduced-motion` support.

## Connect your agent

Claude, ChatGPT / GPT, Codex, Grok (xAI), Cursor, VS Code, Windsurf, Gemini CLI, Cline, Zed and any other MCP client: see **[docs/CONNECT.md](docs/CONNECT.md)** (copy-paste commands and JSON/TOML configs) or `/agents` on a running site.

## Contributing

Issues and PRs are very welcome: read **[CONTRIBUTING.md](CONTRIBUTING.md)** for setup, ground rules (read-only, no secrets, no scraping, be rate-limit friendly) and a list of the most useful things to build next. New deal sources are one small file: [docs/ADDING_A_SOURCE.md](docs/ADDING_A_SOURCE.md).

## License

[MIT](LICENSE)
