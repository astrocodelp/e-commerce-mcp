import { isSkroutzUrl } from "../../ui/links";
import { oldPriceOf, slug, type Campaign, type Deal } from "../../types";

// Skroutz category_id -> our category slug. Unknown categories fall back to a slug of their name, or "other".
const CATEGORY: Record<number, string> = { 40: "smartphones", 1863: "audio", 435: "audio", 3476: "audio", 12: "tv", 25: "laptops", 1705: "smartwatches", 1105: "tablets", 43: "monitors", 405: "appliances", 2401: "robot-vacuums", 88: "storage", 444: "kitchen", 2624: "beauty" };

const CATEGORY_NAMES: [RegExp, string][] = [
  [/κονσολ|παιχνιδομηχαν|gaming console|game console/, "gaming"],
  [/φωτογραφικ|camera/, "cameras"],
  [/καφετιερ|air fryer|φριτεζ|coffee machine/, "kitchen"],
  [/σεσουαρ|πιστολακ|αρωμα|fragrance|hair dryer/, "beauty"],
  [/τουβλακια|επιτραπεζι|παιχνιδ|lego|board game|toys/, "toys"],
  [/αθλητικ.*παπουτσ|sneakers|running shoes/, "sportswear"],
  [/εργαλεια|δραπανο|drill|power tools/, "power-tools"],
  [/καρεκλ.*γραφει|office chair/, "office-furniture"],
  [/καροτσ|stroller/, "baby"],
];

function categoryOf(category?: { category_id: number; name: string }): string {
  if (!category) return "other";
  const name = category.name.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  return CATEGORY[category.category_id] ?? CATEGORY_NAMES.find(([pattern]) => pattern.test(name))?.[1] ?? (slug(name) || "other");
}

type SkDeal = {
  kind: string; status?: string; audience?: string; funded_by?: string; starts_at?: string; ends_at?: string | null;
  benefit?: { type?: string; percentage?: number; price?: number; amount?: number; min_order?: number; installments?: number; tiers?: { min_order: number; installments: number }[] };
  products?: { sku_id: number; name: string; url?: string; product_url?: string }[]; products_count?: number; categories?: { category_id: number; name: string }[]; brands?: { name: string }[];
};
export type SkResult = { success?: boolean; deals?: SkDeal[] };
const eur = (n: number) => `€${n}`;
export function skroutzUrl(sku: number | string, title: string, productUrl?: string): string {
  if (productUrl && isSkroutzUrl(productUrl)) {
    const productId = new URL(productUrl).pathname.match(/^\/s\/(\d+)\/[^/]+\.html$/)?.[1];
    if (productId === String(sku)) return productUrl;
  }
  const url = new URL("https://www.skroutz.gr/search");
  url.searchParams.set("keyphrase", title);
  return url.href;
}

export function parseDeals(results: SkResult[], now = Date.now(), at = new Date(now).toISOString()): { deals: Deal[]; campaigns: Campaign[] } {
  const deals = new Map<number, Deal>(); const campaigns = new Map<string, Campaign>();
  for (const r of results) for (const d of r.deals ?? []) {
    if (d.status && d.status !== "active") continue;
    if (d.ends_at && Date.parse(d.ends_at) < now) continue;
    if (d.audience && d.audience !== "all") continue;
    const p = d.products?.[0];
    if (d.kind === "price_drop" && p && d.products?.length === 1 && d.benefit?.percentage && d.benefit.price && d.benefit.price > 0) {
      const pct = Math.round(d.benefit.percentage); if (pct < 1 || pct > 90) continue;
      const brand = d.brands?.[0]?.name ?? p.name.split(" ")[0];
      const category = categoryOf(d.categories?.[0]);
      const title = p.name.toLowerCase().startsWith(brand.toLowerCase()) ? p.name : `${brand} ${p.name}`;
      const cur = deals.get(p.sku_id);
      if (!cur || pct > cur.discountPct) deals.set(p.sku_id, {
        id: `skroutz:${p.sku_id}`, source: "skroutz", nativeId: String(p.sku_id), sku_id: p.sku_id, title, brand, category, shop: null,
        price: d.benefit.price, discountPct: pct, oldPrice: oldPriceOf(d.benefit.price, pct), baseline: "previous_price",
        url: skroutzUrl(p.sku_id, title, p.product_url ?? p.url), imageUrl: null, verify: `Skroutz Shopping connector: get_product(sku_id=${p.sku_id}) then add_to_cart`, fetchedAt: at, endsAt: d.ends_at ?? null,
      });
    } else if (d.funded_by === "skroutz" && !d.products?.length && d.starts_at) {
      const b = d.benefit; const id = `${d.kind}-${d.starts_at}`;
      if (d.kind === "mission" && b?.amount && b.min_order) campaigns.set(id, { id, source: "skroutz", title: `${eur(b.amount)} off orders of ${eur(b.min_order)}+`, description: "Skroutz-funded reward on a qualifying purchase.", startsAt: d.starts_at, endsAt: d.ends_at ?? null });
      else if (d.kind === "interest_free_installments" && b?.tiers?.length) campaigns.set(id, { id, source: "skroutz", title: "Interest-free installments", description: b.tiers.map(t => `${t.installments} from ${eur(t.min_order)}`).join(", "), startsAt: d.starts_at, endsAt: d.ends_at ?? null });
    }
  }
  return { deals: [...deals.values()], campaigns: [...campaigns.values()] };
}
