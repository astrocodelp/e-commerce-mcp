import type { Deal } from "../types";
import { isEbayUrl, isImageUrl } from "../ui/links";
import { RateLimitedError, type Provider } from "./types";

const API = "https://api.ebay.com";
const CATEGORIES = [
  ["9355", "smartphones"],
  ["112529", "audio"],
  ["175672", "laptops"],
  ["171485", "tablets"],
  ["139971", "gaming"],
  ["31388", "cameras"],
] as const;

type Money = { value?: string; currency?: string };
type Item = {
  itemId?: string;
  title?: string;
  itemWebUrl?: string;
  image?: { imageUrl?: string };
  seller?: { username?: string };
  price?: Money;
  marketingPrice?: { originalPrice?: Money };
};

async function ebayJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(API + path, { ...init, cache: "no-store", redirect: "error" });
  if (response.status === 429) {
    const retry = response.headers.get("retry-after");
    const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : (Date.parse(retry ?? "") - Date.now()) / 1000;
    throw new RateLimitedError(seconds > 0 ? Math.ceil(seconds) : 3600, "eBay rate limit");
  }
  if (!response.ok) throw new Error(`eBay ${path.split("?")[0]} returned HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function toDeal(item: Item, category: string, fetchedAt: string): Deal | undefined {
  if (!item.itemId || !item.title?.trim() || !item.itemWebUrl || !isEbayUrl(item.itemWebUrl)) return;
  const original = item.marketingPrice?.originalPrice;
  if (item.price?.currency !== "EUR" || original?.currency !== "EUR") return;
  const price = Number(item.price.value);
  const oldPrice = Number(original.value);
  if (!Number.isFinite(price) || !Number.isFinite(oldPrice) || price <= 0 || oldPrice <= price) return;
  const discountPct = Math.round((1 - price / oldPrice) * 100);
  if (discountPct < 1 || discountPct >= 100) return;
  const imageUrl = item.image?.imageUrl;
  return {
    id: `ebay:${item.itemId}`, source: "ebay", nativeId: item.itemId, title: item.title,
    brand: "Unspecified", category, shop: item.seller?.username ?? null,
    price, oldPrice, discountPct, baseline: "previous_price", url: item.itemWebUrl,
    imageUrl: imageUrl && isImageUrl(imageUrl) ? imageUrl : null,
    verify: "Open the eBay listing to confirm price, availability and delivery costs to Greece.",
    fetchedAt,
  };
}

export const ebay: Provider = {
  id: "ebay", name: "eBay", kind: "marketplace", homepage: "https://www.ebay.de",
  cart: false, minDeals: 1, timeoutMs: 15_000,
  enabled: () => Boolean(process.env.EBAY_CLIENT_ID?.trim() && process.env.EBAY_CLIENT_SECRET?.trim()),
  async fetchDeals({ signal }) {
    const id = process.env.EBAY_CLIENT_ID?.trim();
    const secret = process.env.EBAY_CLIENT_SECRET?.trim();
    if (!id || !secret) throw new Error("eBay Browse credentials are missing");
    const { access_token } = await ebayJson<{ access_token?: string }>("/identity/v1/oauth2/token", {
      method: "POST", signal,
      headers: {
        authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials", scope: `${API}/oauth/api_scope` }),
    });
    if (!access_token) throw new Error("eBay did not return an application token");

    const deals = new Map<string, Deal>();
    const fetchedAt = new Date().toISOString();
    for (const [categoryId, category] of CATEGORIES) {
      signal.throwIfAborted();
      const params = new URLSearchParams({
        category_ids: categoryId, limit: "40",
        filter: "buyingOptions:{FIXED_PRICE},conditions:{NEW},deliveryCountry:GR",
      });
      const { itemSummaries = [] } = await ebayJson<{ itemSummaries?: Item[] }>(`/buy/browse/v1/item_summary/search?${params}`, {
        signal,
        headers: {
          authorization: `Bearer ${access_token}`,
          "x-ebay-c-marketplace-id": "EBAY_DE",
          "x-ebay-c-enduserctx": "contextualLocation=country%3DGR",
        },
      });
      for (const item of itemSummaries) {
        const deal = toDeal(item, category, fetchedAt);
        if (deal && !deals.has(deal.id)) deals.set(deal.id, deal);
      }
    }
    return { deals: [...deals.values()] };
  },
};
