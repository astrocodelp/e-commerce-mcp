import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { filterDeals, facets, publicDeal, resolveDeal, SORTS } from "@/lib/query";
import { getSnapshot } from "@/lib/deals-source";
import { PROMPTS, SYSTEM_PROMPT } from "@/lib/agent-copy";
import { categoryLabel, overall } from "@/lib/types";
import { isImageUrl, isSkroutzUrl } from "@/lib/ui/links";
import { WIDGET_CSP, WIDGET_HTML, WIDGET_MIME, WIDGET_MIME_OPENAI, WIDGET_URI, WIDGET_URI_OPENAI } from "@/lib/ui/widget";

export const maxDuration = 60;
const json = (o: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(o) }] });
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
// MCP Apps: hosts that support UI render the widget for these tools; others just read the JSON text.
const uiMeta = { ui: { resourceUri: WIDGET_URI }, "ui/resourceUri": WIDGET_URI, "openai/outputTemplate": WIDGET_URI_OPENAI };
const withUi = (structured: Record<string, unknown>, text: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(text) }], structuredContent: structured });
const VERIFY = "Prices come from live sources at updatedAt. Each deal has a `verify` hint: confirm the price with the source's own tools before buying. Only sources with cart=true (see list_sources) can fill a cart; for the others hand the link to the user.";

const handler = createMcpHandler(
  (server) => {
    server.registerTool("search_deals", {
      title: "Search Black Friday deals",
      description: `Search live Black Friday deals from every source (Skroutz, BestPrice, ...) with filters and sorting. Read-only. In clients that support MCP Apps this renders product cards with images and an add-to-basket button. ${VERIFY}`,
      _meta: uiMeta,
      inputSchema: z.object({
        query: z.string().optional().describe("Free text, e.g. 'sony headphones'"),
        category: z.string().optional().describe("Category key from list_categories, e.g. 'tv'"),
        brand: z.string().optional().describe("Exact brand from list_brands, e.g. 'Sony'"),
        source: z.string().optional().describe("Source id from list_sources, e.g. 'skroutz' or 'bestprice'"),
        shop: z.string().optional().describe("Retailer name from list_shops, e.g. 'Plaisio' (only some sources report the shop)"),
        min_price: z.number().optional().describe("EUR"), max_price: z.number().optional().describe("EUR"),
        min_discount: z.number().min(0).max(95).optional().describe("Minimum discount percent"),
        sort: z.enum(SORTS).optional().describe("discount (default) | price_asc | price_desc | savings (biggest EUR saved)"),
        limit: z.number().int().min(1).max(50).optional(), offset: z.number().int().min(0).optional(),
      }),
      annotations,
    }, async (a) => {
      const snap = await getSnapshot();
      const all = filterDeals(snap.deals, { q: a.query, category: a.category, brand: a.brand, source: a.source, shop: a.shop, minPrice: a.min_price, maxPrice: a.max_price, minDiscount: a.min_discount, sort: a.sort });
      const offset = a.offset ?? 0, limit = a.limit ?? 10;
      const page = all.slice(offset, offset + limit).map(publicDeal);
      return withUi({ view: "deals", updatedAt: snap.updatedAt, total: all.length, deals: page }, { updatedAt: snap.updatedAt, total: all.length, offset, deals: page, note: VERIFY });
    });

    server.registerTool("get_deal", { title: "Get deal", description: "Get one deal by id (`<source>:<id>`, e.g. 'skroutz:60478236'; a bare Skroutz sku id also works).",
      inputSchema: z.object({ id: z.string() }), annotations, _meta: uiMeta }, async ({ id }) => {
      const snap = await getSnapshot(); const d = resolveDeal(snap.deals, id);
      return d ? withUi({ view: "deals", updatedAt: snap.updatedAt, total: 1, deals: [publicDeal(d)] }, { updatedAt: snap.updatedAt, deal: publicDeal(d), note: VERIFY }) : { isError: true, ...json({ error: "not_found", hint: "use search_deals" }) };
    });

    server.registerTool("compare_deals", { title: "Compare deals", description: "Compare 2-6 deals side by side by id. Works across sources.",
      inputSchema: z.object({ ids: z.array(z.string()).min(2).max(6) }), annotations, _meta: uiMeta }, async ({ ids }) => {
      const snap = await getSnapshot(); const rows = ids.map(i => resolveDeal(snap.deals, i)).filter((d): d is NonNullable<typeof d> => !!d).map(publicDeal);
      return withUi({ view: "deals", updatedAt: snap.updatedAt, total: rows.length, deals: rows }, { updatedAt: snap.updatedAt, rows, biggestDiscount: [...rows].sort((a, b) => b.discountPct - a.discountPct)[0]?.id, cheapest: [...rows].sort((a, b) => a.price - b.price)[0]?.id, bestSavings: [...rows].sort((a, b) => b.savings - a.savings)[0]?.id });
    });

    server.registerTool("list_sources", { title: "List sources", description: "The deal sources behind this server, with live/cached status, deal counts and whether agents can build a cart through them.", inputSchema: z.object({}), annotations },
      async () => { const s = await getSnapshot(); return json({ updatedAt: s.updatedAt, status: overall(s.sources), sources: s.sources }); });
    server.registerTool("list_categories", { title: "List categories", description: "Categories with deal counts.", inputSchema: z.object({}), annotations }, async () => {
      const f = facets((await getSnapshot()).deals); return json(f.categories.map(c => ({ ...c, label: categoryLabel(c.key) })));
    });
    server.registerTool("list_brands", { title: "List brands", description: "Brands with deal counts.", inputSchema: z.object({}), annotations },
      async () => json(facets((await getSnapshot()).deals).brands));
    server.registerTool("list_shops", { title: "List shops", description: "Retailers (e.g. Plaisio, Kotsovolos, Public) that sources report for their deals, with deal counts.", inputSchema: z.object({}), annotations },
      async () => json(facets((await getSnapshot()).deals).shops));
    server.registerTool("list_campaigns", { title: "List campaigns", description: "Marketplace-wide Black Friday campaigns (cart rewards, interest-free installments).", inputSchema: z.object({}), annotations },
      async () => { const s = await getSnapshot(); return json({ updatedAt: s.updatedAt, campaigns: s.campaigns }); });
    server.registerTool("get_freshness", { title: "Data freshness", description: "When prices were last fetched, per source.", inputSchema: z.object({}), annotations },
      async () => { const s = await getSnapshot(); return json({ updatedAt: s.updatedAt, ageSeconds: Math.round((Date.now() - Date.parse(s.updatedAt)) / 1000), deals: s.deals.length, status: overall(s.sources), sources: s.sources }); });

    server.registerTool("build_shopping_plan", {
      title: "Build shopping plan",
      description: "Pick the best deal per wishlist item within a budget and say how to verify and buy each one. Does not buy anything.",
      inputSchema: z.object({ budget: z.number().positive().describe("EUR"), wishlist: z.array(z.string()).min(1).max(20), prefer: z.enum(SORTS).optional(), source: z.string().optional() }), annotations, _meta: uiMeta,
    }, async ({ budget, wishlist, prefer, source }) => {
      const snap = await getSnapshot(); let total = 0; const cart = new Map(snap.sources.map(s => [s.id, s.cart]));
      const picks = wishlist.map(item => {
        const c = filterDeals(snap.deals, { q: item, sort: prefer, source })[0] ?? filterDeals(snap.deals, { category: item, sort: prefer, source })[0];
        if (!c) return { item, match: null };
        const fitsBudget = total + c.price <= budget; if (fitsBudget) total += c.price;
        return { item, match: publicDeal(c), fitsBudget, canAddToCart: cart.get(c.source) ?? false };
      });
      const shown = picks.flatMap(p => (p.match ? [p.match] : []));
      return withUi({ view: "deals", updatedAt: snap.updatedAt, total: shown.length, deals: shown }, { updatedAt: snap.updatedAt, budget, plannedTotal: +total.toFixed(2), picks,
        nextSteps: ["For each pick follow match.verify to confirm the live price.", "For picks with canAddToCart=true, call the source connector's add_to_cart for verified items within budget (one call, all items), then get_cart.",
          "For picks with canAddToCart=false, give the user the deal url.", "STOP. Do not pay. Give the user the cart_url / links and ask for confirmation."] });
    });

    server.registerTool("show_basket", {
      title: "Show basket / cart",
      description: "Show the user a basket or cart UI (product images, totals, a button to add to the Skroutz cart, and a button to go to the cart and pay). Call it: (1) with `ids` of chosen deals to show a basket; (2) after Skroutz add_to_cart, with the returned `cart_url` (and optionally `skroutz_cart` from get_cart) so the user can open their real cart and pay. Never pays or buys anything.",
      inputSchema: z.object({
        ids: z.array(z.string()).max(30).optional().describe("Deal ids from search_deals, e.g. 'skroutz:60478236'"),
        cart_url: z.string().url().optional().describe("The cart_url returned by the Skroutz add_to_cart tool"),
        skroutz_cart: z.object({ total: z.number().optional(), items: z.array(z.object({ title: z.string().optional(), name: z.string().optional(), price: z.number().optional(), quantity: z.number().int().min(1).optional(), image_url: z.string().url().optional(), sku_id: z.number().optional() })).max(60) }).optional().describe("Items from the Skroutz get_cart result, to show the real cart"),
        images: z.record(z.string(), z.string().url()).optional().describe("Optional deal id → product image URL (e.g. image_url from Skroutz get_product) for deals that have no image"),
      }), annotations, _meta: uiMeta,
    }, async ({ ids, cart_url, skroutz_cart, images }) => {
      const snap = await getSnapshot();
      const seen = new Set<string>();
      const items = (ids ?? []).map(i => resolveDeal(snap.deals, i)).filter((d): d is NonNullable<typeof d> => !!d && !seen.has(d.id) && !!seen.add(d.id))
        .map(d => publicDeal(images?.[d.id] && isImageUrl(images[d.id]) ? { ...d, imageUrl: images[d.id] } : d));
      const cartUrl = cart_url && isSkroutzUrl(cart_url) ? cart_url : null;
      const cart = skroutz_cart ? { total: skroutz_cart.total ?? null, items: skroutz_cart.items.map(i => ({ title: i.title ?? i.name ?? "Item", price: i.price ?? null, quantity: i.quantity ?? 1, imageUrl: i.image_url && isImageUrl(i.image_url) ? i.image_url : null, skuId: i.sku_id ?? null })) } : null;
      const view = cart ? "cart" : "basket";
      const total = +items.reduce((n, d) => n + d.price, 0).toFixed(2);
      return withUi({ view, updatedAt: snap.updatedAt, items, cartUrl, skroutzCart: cart },
        { view, items: items.map(d => ({ id: d.id, title: d.title, price: d.price, source: d.source, url: d.url })), basketTotal: total, cartUrl, cart, note: cartUrl ? "Tell the user to open the cart link to review and pay; you cannot pay." : "To fill a Skroutz cart call add_to_cart on the Skroutz Shopping connector, then call show_basket again with its cart_url." });
    });

    for (const [name, uri, mime] of [["deals-ui", WIDGET_URI, WIDGET_MIME], ["deals-ui-openai", WIDGET_URI_OPENAI, WIDGET_MIME_OPENAI]] as const) {
      const meta = { ui: { csp: WIDGET_CSP, prefersBorder: false }, "openai/widgetCSP": { resource_domains: WIDGET_CSP.resourceDomains, connect_domains: [] } };
      server.registerResource(name, uri, { title: "Black Friday deals & basket", mimeType: mime, _meta: meta },
        async (u) => ({ contents: [{ uri: u.href, mimeType: mime, text: WIDGET_HTML, _meta: meta }] }));
    }

    server.registerTool("get_agent_instructions", { title: "Agent instructions", description: "Recommended system prompt for shopping agents.", inputSchema: z.object({}), annotations },
      async () => ({ content: [{ type: "text" as const, text: SYSTEM_PROMPT }] }));

    for (const p of PROMPTS) server.registerPrompt(p.id, { title: p.title, description: p.title },
      async () => ({ messages: [{ role: "user" as const, content: { type: "text" as const, text: p.text } }] }));
    server.registerResource("agent-instructions", "bf://instructions", { title: "Agent instructions", mimeType: "text/plain" },
      async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/plain", text: SYSTEM_PROMPT }] }));
  },
  { serverInfo: { name: "blackfriday-mcp", version: "0.5.0" } },
);
export { handler as GET, handler as POST, handler as DELETE };
