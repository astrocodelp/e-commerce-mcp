import test from "node:test";
import assert from "node:assert/strict";
import { facets, filterDeals, resolveDeal } from "../lib/query";
import type { Deal } from "../lib/types";

const d = (o: Partial<Deal>): Deal => ({ id: "skroutz:1", source: "skroutz", nativeId: "1", title: "Sony WH-1000XM6", brand: "Sony", category: "audio", shop: null, price: 300, oldPrice: 400, discountPct: 25, baseline: "previous_price", url: "https://www.skroutz.gr/s/1", fetchedAt: "", ...o });
const deals = [d({}), d({ id: "bestprice:bp_2", source: "bestprice", nativeId: "bp_2", title: "LG OLED TV", brand: "LG", category: "tv", shop: "Public", price: 900, oldPrice: 1000, discountPct: 10, baseline: "median_180d" })];

test("filters by source, shop, category and price", () => {
  assert.equal(filterDeals(deals, { source: "bestprice" }).length, 1);
  assert.equal(filterDeals(deals, { shop: "public" })[0].id, "bestprice:bp_2");
  assert.equal(filterDeals(deals, { category: "audio", maxPrice: 350 }).length, 1);
  assert.equal(filterDeals(deals, { minDiscount: 20 }).length, 1);
});
test("sorts by price and by euros saved", () => {
  assert.deepEqual(filterDeals(deals, { sort: "price_asc" }).map(x => x.price), [300, 900]);
  assert.equal(filterDeals(deals, { sort: "savings" })[0].id, "skroutz:1");
});
test("resolves ids across sources, legacy sku- ids and bare Skroutz ids", () => {
  assert.equal(resolveDeal(deals, "skroutz:1")?.id, "skroutz:1");
  assert.equal(resolveDeal(deals, "sku-1")?.id, "skroutz:1");
  assert.equal(resolveDeal(deals, "bestprice:bp_2")?.id, "bestprice:bp_2");
});
test("facets count categories, shops and sources", () => {
  const f = facets(deals, [{ id: "skroutz", name: "Skroutz", kind: "marketplace", homepage: "", cart: true, status: "live", count: 1, updatedAt: null }]);
  assert.equal(f.shops[0].key, "Public");
  assert.equal(f.sources[0].count, 1);
});
