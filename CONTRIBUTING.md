# Contributing

Thanks for helping make this better. This project is an **agent-first Black Friday deal feed for Greece**: an open, read-only MCP server that merges deals from several sources, plus a fast web UI and an MCP App (inline product cards, basket and cart). Small, focused PRs are very welcome.

## Quick start

```bash
git clone https://github.com/astrocodelp/e-commerce-mcp && cd e-commerce-mcp
npm install
cp .env.example .env.local     # optional: without it you get bundled sample data
npm run dev                    # http://localhost:3000
npm test                       # unit tests, no network needed
npm run typecheck && npm run build
```

Everything works with **no env vars** (Skroutz shows bundled sample deals; BestPrice needs no setup). See the README for the one-time Skroutz sign-in if you want live Skroutz data.

## Ground rules (please read)

1. **Read-only.** MCP tools never buy, pay, or touch a user's real cart. Buying happens in the source's own connector and the human pays on the shop's site.
2. **No secrets in the repo, ever.** Use env vars (`.env.example` lists names only). Never paste tokens into issues, PRs or tests.
3. **No scraping.** Sources must be official MCP servers, APIs or product feeds. If a site only has a website, it is out of scope.
4. **Be a polite client.** Respect rate limits (BestPrice's free tier is capped), keep call budgets small, stop on `429`.
5. **Be honest about prices.** Every deal says how its "was" price was derived (`baseline`). Never invent discounts.
6. **Untrusted data.** Anything from a source is rendered as text; links and images are host-allowlisted (`lib/ui/links.ts`).

## Where help is most valuable

| Idea | Where | Notes |
| --- | --- | --- |
| **New sources** (Amazon via a legal data API, retailer product feeds, other marketplace MCPs) | `lib/providers/` | One file + one registry line. Start with [docs/ADDING_A_SOURCE.md](docs/ADDING_A_SOURCE.md). |
| Cross-source matching (same product on Skroutz and BestPrice) by GTIN/model | `lib/query.ts`, new `lib/match.ts` | Show the cheapest source per product; keep both visible. |
| Product images for Skroutz deals | `lib/providers/skroutz/` | `search_deals` has none; `get_product` does. Fetch only for the top N and respect limits. |
| Better category mapping and Greek/English search | `lib/providers/*/parse.ts`, `lib/query.ts` | Add tests with real response shapes. |
| Price-history sparkline per deal (BestPrice has the data) | `app/explorer.tsx`, `lib/ui/widget.ts` | Keep it light, no chart library. |
| Greek UI translation | `app/*`, `lib/ui/widget.ts` | Keep strings in one place first. |
| MCP App polish and more hosts | `lib/ui/widget.ts` | Test with the host harness approach in `tests/`. Keep it dependency-free. |
| Accessibility and performance audits | `app/*` | Keyboard, contrast, reduced motion, Lighthouse. |
| More client setup snippets | `lib/clients.ts` | One entry each; link the client's docs. |

## Design principles (UI)

Follow the existing craft: strong ease-out curves, 150–250ms transitions on `transform`/`opacity` only, press feedback on buttons, hover effects only on hover-capable devices, `prefers-reduced-motion` support, tabular numbers for prices, solid (not translucent) surfaces over scrolling content, no horizontal overflow at 360px. Check your change at desktop width and ~380px.

## Making a change

1. Open an issue first for anything big (new source, API change).
2. Branch from `main`, keep the PR focused, add or update tests (`tests/`).
3. `npm run typecheck && npm test && npm run build` must pass (CI runs the same).
4. Update the docs if behaviour changes (README, `docs/`, `lib/agent-copy.ts` for what agents are told).
5. In the PR, say what you changed, why, and how you tested it. Screenshots for UI changes.

### Testing a provider without hitting the network

Spin up a tiny local HTTP server that replays the source's real response shapes (including a `429`) and point the provider at it via an env var, as `tests/providers.test.ts` does for BestPrice. Please do not run tests that hammer a third party's production API.

## Code of conduct

Be kind and constructive. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
