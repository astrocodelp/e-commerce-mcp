/** A single deal from any source. `id` is globally unique: `${source}:${nativeId}`. */
export type Deal = {
  id: string; source: string; nativeId: string; sku_id?: number;
  title: string; brand: string; category: string; shop?: string | null;
  price: number; oldPrice: number; discountPct: number;
  /** How oldPrice was derived: the merchant's previous price, or the 180-day median price. */
  baseline: "previous_price" | "median_180d";
  url: string; imageUrl?: string | null; verify?: string; fetchedAt: string; endsAt?: string | null;
};
export type Campaign = { id: string; source?: string; title: string; description: string; startsAt: string; endsAt: string | null };
export type SourceStatus = "live" | "cached" | "sample" | "error";
export type SourceInfo = {
  id: string; name: string; kind: "marketplace" | "comparison"; homepage: string;
  /** true when agents can build a cart through that source's own connector; false = hand the link to the human. */
  cart: boolean; status: SourceStatus; count: number; updatedAt: string | null; note?: string;
};
export type Snapshot = { updatedAt: string; deals: Deal[]; campaigns: Campaign[]; sources: SourceInfo[] };
/** What one provider produced on its own. */
export type ProviderSnapshot = { updatedAt: string; deals: Deal[]; campaigns: Campaign[]; status: SourceStatus };

const LABELS: Record<string, string> = {
  smartphones: "Smartphones", audio: "Headphones & audio", tv: "TVs", laptops: "Laptops", smartwatches: "Smartwatches",
  "robot-vacuums": "Robot vacuums", tablets: "Tablets", appliances: "Home appliances", gaming: "Gaming", monitors: "Monitors",
  cameras: "Cameras", kitchen: "Kitchen", beauty: "Beauty", toys: "Toys", storage: "Storage", other: "Other",
};
export const categoryLabel = (c: string) => LABELS[c] ?? c.replace(/-/g, " ").replace(/^./, m => m.toUpperCase());
export const eur = (n: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n);
export const oldPriceOf = (price: number, pct: number) => Math.round((price / (1 - pct / 100)) * 100) / 100;
export const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** Overall feed health shown in the UI: live if any source is live. */
export function overall(sources: SourceInfo[]): SourceStatus {
  if (sources.some(s => s.status === "live")) return "live";
  if (sources.some(s => s.status === "cached")) return "cached";
  return sources.some(s => s.status === "sample") ? "sample" : "error";
}
