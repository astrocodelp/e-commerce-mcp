import type { Campaign, Deal } from "../types";

export type FetchCtx = {
  /** Aborts when the provider's time budget is spent. Stop starting new calls and return what you have. */
  signal: AbortSignal;
};
/** Throw this when the source says to back off; the cache honours `retryAfterSec` instead of retrying in minutes. */
export class RateLimitedError extends Error { constructor(public retryAfterSec: number, msg = "rate limited") { super(msg); } }
export type ProviderData = { deals: Deal[]; campaigns?: Campaign[] };

/**
 * A deal source. To add one (Amazon, a retailer feed, another marketplace MCP):
 *   1. create lib/providers/<id>.ts exporting a Provider
 *   2. add it to PROVIDERS in lib/providers/index.ts
 * Everything else (hourly cache, fallback snapshots, API, MCP tools, filters, UI) picks it up automatically.
 * See docs/ADDING_A_SOURCE.md.
 */
export interface Provider {
  /** Stable slug stored on every deal, used in ids (`<id>:<nativeId>`) and the `source` filter. */
  id: string;
  name: string;
  kind: "marketplace" | "comparison";
  homepage: string;
  /** true when the source has its own agent connector that can fill a cart; false = hand the link to the human. */
  cart: boolean;
  /** How long fetched deals stay fresh, in seconds. Default 3600 (hourly). Raise it for sources with tight rate limits. */
  refreshSeconds?: number;
  /** Time budget for one refresh. Default 45s. */
  timeoutMs?: number;
  /** Fewer deals than this counts as a failed refresh (the previous snapshot is kept). Default 5. */
  minDeals?: number;
  /** Return false to skip the source entirely, e.g. optional credentials are missing. */
  enabled?(): boolean;
  /** Fetch fresh deals. Throw on failure; return partial results if the signal aborts. */
  fetchDeals(ctx: FetchCtx): Promise<ProviderData>;
  /** Optional bundled fallback used before the first successful refresh. */
  seed?(): ProviderData & { updatedAt: string };
}
