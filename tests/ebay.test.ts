import assert from "node:assert/strict";
import test from "node:test";
import { ebay } from "../lib/providers/ebay";
import { RateLimitedError } from "../lib/providers/types";

const item = {
  itemId: "v1|123|0",
  title: "Sony headphones",
  itemWebUrl: "https://www.ebay.de/itm/123",
  image: { imageUrl: "https://i.ebayimg.com/images/g/example/s-l500.jpg" },
  seller: { username: "seller" },
  price: { value: "80.00", currency: "EUR" },
  marketingPrice: { originalPrice: { value: "100.00", currency: "EUR" } },
};

test("eBay requests fixed-price listings deliverable to Greece and returns unique EUR discounts", async t => {
  process.env.EBAY_CLIENT_ID = "app";
  process.env.EBAY_CLIENT_SECRET = "secret";
  t.after(() => { delete process.env.EBAY_CLIENT_ID; delete process.env.EBAY_CLIENT_SECRET; });
  assert.equal(ebay.enabled?.(), true);
  let tokenCalls = 0;
  const categories = new Set<string | null>();
  t.mock.method(globalThis, "fetch", async (input: string | URL, init: RequestInit) => {
    const url = new URL(input);
    const headers = new Headers(init.headers);
    if (url.pathname.endsWith("/token")) {
      tokenCalls++;
      assert.equal(headers.get("authorization"), "Basic YXBwOnNlY3JldA==");
      assert.equal(new URLSearchParams(String(init.body)).get("grant_type"), "client_credentials");
      return Response.json({ access_token: "token" });
    }
    assert.equal(headers.get("authorization"), "Bearer token");
    assert.equal(url.searchParams.get("limit"), "100");
    categories.add(url.searchParams.get("category_ids"));
    assert.equal(headers.get("x-ebay-c-marketplace-id"), "EBAY_DE");
    assert.match(url.searchParams.get("filter")!, /buyingOptions:\{FIXED_PRICE\}.*deliveryCountry:GR/);
    return Response.json({ itemSummaries: [
      item, item,
      { ...item, itemId: "usd", price: { value: "80", currency: "USD" } },
      { ...item, itemId: "no-discount", marketingPrice: undefined },
      { ...item, itemId: "other-host", itemWebUrl: "https://example.com/itm/123" },
    ] });
  });
  const { deals } = await ebay.fetchDeals({ signal: new AbortController().signal });
  assert.equal(tokenCalls, 1);
  assert.ok(categories.has("220") && categories.has("80053"));
  assert.equal(deals.length, 1);
  assert.deepEqual(
    [deals[0].id, deals[0].price, deals[0].oldPrice, deals[0].discountPct, deals[0].shop, deals[0].imageUrl],
    ["ebay:v1|123|0", 80, 100, 20, "seller", item.image.imageUrl],
  );
});

test("eBay is inactive without credentials and aborts the refresh on a Browse rate limit", async t => {
  delete process.env.EBAY_CLIENT_ID;
  delete process.env.EBAY_CLIENT_SECRET;
  assert.equal(ebay.enabled?.(), false);
  process.env.EBAY_CLIENT_ID = "app";
  process.env.EBAY_CLIENT_SECRET = "secret";
  t.after(() => { delete process.env.EBAY_CLIENT_ID; delete process.env.EBAY_CLIENT_SECRET; });
  let searches = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL) => {
    if (String(input).endsWith("/token")) return Response.json({ access_token: "token" });
    searches++;
    return new Response(null, { status: 429, headers: { "retry-after": "900" } });
  });
  await assert.rejects(ebay.fetchDeals({ signal: new AbortController().signal }), (error: unknown) =>
    error instanceof RateLimitedError && error.retryAfterSec === 900);
  assert.equal(searches, 1);
});
