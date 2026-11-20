import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { parseDeals } from "../lib/providers/skroutz/parse";

// --- Skroutz: parsing real search_deals response shapes ---
const NOW = Date.parse("2026-11-19T20:00:00Z");
const drop = (sku: number, name: string, pct: number, price: number, cat: [number, string], brand: string, extra = {}) => ({ kind: "price_drop", status: "active", audience: "all", ends_at: null,
  benefit: { type: "percentage", percentage: pct, price }, products: [{ sku_id: sku, name }], categories: [{ category_id: cat[0], name: cat[1] }], brands: [{ name: brand }], ...extra });

test("skroutz: keeps valid price drops, drops expired / b2b / multi-buy, dedupes, maps categories", () => {
  const r = { success: true, deals: [drop(1, "WH-1000XM6", 24, 329.99, [1863, "Headphones"], "Sony"), drop(1, "WH-1000XM6", 24, 329.99, [1863, "Headphones"], "Sony"),
    drop(2, "Old", 10, 50, [40, "x"], "A", { ends_at: "2026-11-01T00:00:00Z" }), drop(3, "B2B", 10, 50, [40, "x"], "A", { audience: "b2b" }),
    { kind: "multi_buy", status: "active", audience: "all", benefit: { percentage: 5 }, products: [{ sku_id: 9, name: "m" }, { sku_id: 10, name: "n" }] }] };
  const { deals } = parseDeals([r] as never, NOW);
  assert.equal(deals.length, 1);
  assert.equal(deals[0].id, "skroutz:1"); assert.equal(deals[0].category, "audio"); assert.equal(deals[0].title, "Sony WH-1000XM6"); assert.equal(deals[0].oldPrice, 434.2);
});
test("skroutz: parses campaigns", () => {
  const { campaigns } = parseDeals([{ deals: [{ kind: "mission", status: "active", audience: "all", funded_by: "skroutz", starts_at: "2026-11-16T00:00:00Z", benefit: { amount: 30, min_order: 60 } }] }] as never, NOW);
  assert.equal(campaigns[0].title, "€30 off orders of €60+");
});

// --- BestPrice: against a local replay of its MCP protocol (no network, no rate-limit use) ---
let mode: "ok" | "limited" = "ok"; let calls = 0;
const srv = http.createServer((req, res) => { let b = ""; req.on("data", c => (b += c)); req.on("end", () => {
  calls++; const m = JSON.parse(b); const reply = (o: unknown, s = 200, h: Record<string, string> = {}) => { res.writeHead(s, { "content-type": "application/json", ...h }); res.end(JSON.stringify(o)); };
  if (m.method === "notifications/initialized") return reply({}, 202);
  if (m.method === "initialize") return reply({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: "2025-06-18" } });
  if (mode === "limited") return reply({ jsonrpc: "2.0", id: m.id, error: { code: -32031, message: "cap" } }, 429, { "retry-after": "600" });
  const sc = (x: unknown) => reply({ jsonrpc: "2.0", id: m.id, result: { structuredContent: x, content: [{ type: "text", text: "x" }] } });
  const { name, arguments: a } = m.params; const tail = (id: string) => Number(id.slice(-1));
  if (name === "search_products") return sc({ products: Array.from({ length: 8 }, (_, i) => ({ product_id: `bp_${a.query.length}${i}`, title: `${a.query} ${i}`, brand: "Sony", category_title: "Headphones", price_from: 100 + i * 50, availability: "available", bestprice_url: "https://www.bestprice.gr/x", image_url: "https://abpcdn.pstatic.gr/x.webp" })) });
  if (name === "get_price_history") return sc({ current_price: 100 + tail(a.product_id) * 50, window_stats: [{ days: 180, median_price: (100 + tail(a.product_id) * 50) * 1.25, minimum_price: 1, observations: 80 }] });
  if (name === "compare_offers") return sc({ offers: [{ merchant_name: "Public", item_price: 100 }, { merchant_name: "Plaisio", item_price: 105 }] });
  reply({ jsonrpc: "2.0", id: m.id, error: { code: -32601, message: "unknown" } });
}); });
let provider: typeof import("../lib/providers/bestprice");
let RateLimitedError: typeof import("../lib/providers/types").RateLimitedError;
before(async () => {
  await new Promise<void>(r => srv.listen(0, "127.0.0.1", r));
  process.env.BESTPRICE_MCP_URL = `http://127.0.0.1:${(srv.address() as { port: number }).port}/mcp`; // read when the module loads
  provider = await import("../lib/providers/bestprice"); ({ RateLimitedError } = await import("../lib/providers/types"));
});
after(() => srv.close());
const run = () => provider.bestprice.fetchDeals({ signal: new AbortController().signal });

test("bestprice: turns price history into deals with a 180-day-median baseline and the cheapest shop", async () => {
  mode = "ok"; calls = 0; const { deals } = await run();
  assert.ok(deals.length > 0 && calls <= 70, `budget respected (${calls} calls)`);
  assert.ok(deals.every(d => d.source === "bestprice" && d.baseline === "median_180d" && d.oldPrice > d.price));
  assert.equal(deals.find(d => d.shop)?.shop, "Public");
});
test("bestprice: a 429 becomes RateLimitedError with the Retry-After value and stops quickly", async () => {
  mode = "limited"; calls = 0;
  const err = await run().then(() => null, (e: unknown) => e);
  assert.ok(err instanceof RateLimitedError); assert.equal((err as { retryAfterSec: number }).retryAfterSec, 600); assert.ok(calls <= 6);
});
