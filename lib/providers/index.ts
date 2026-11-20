import { bestprice } from "./bestprice";
import { ebay } from "./ebay";
import { skroutz } from "./skroutz";
import type { Provider } from "./types";

/**
 * The registry. Add a source = create its Provider file and list it here.
 * Order is the display order. Set SOURCES=skroutz,bestprice (comma list) to restrict which run.
 */
export const PROVIDERS: Provider[] = [skroutz, bestprice, ebay];

export function enabledProviders(): Provider[] {
  const only = process.env.SOURCES?.split(",").map(s => s.trim()).filter(Boolean);
  return PROVIDERS.filter(p => (only ? only.includes(p.id) : true) && (p.enabled?.() ?? true));
}
export const getProvider = (id: string) => PROVIDERS.find(p => p.id === id);
