import { McpClient, McpRateLimitError } from "../../mcp-client";
import { mapPool } from "../../http";
import { RateLimitedError, type Provider } from "../types";
import { getAccessToken } from "./oauth";
import { parseDeals, type SkResult } from "./parse";
import { SKROUTZ_SEED } from "./seed";

export const MCP_URL = "https://api.skroutz.gr/api/agents/mcp/shopping";

// Put broad, distinct categories first so slow refreshes still cover more than electronics.
const QUERIES = [
  "smartphone", "headphones", "smart tv", "laptop", "smartwatch", "tablet",
  "gaming monitor", "πλυντήριο ρούχων", "ρομποτική σκούπα", "air fryer", "SSD",
  "κονσόλα παιχνιδιών", "φωτογραφική μηχανή", "καφετιέρα", "σεσουάρ μαλλιών",
  "επώνυμα αρώματα", "LEGO", "επιτραπέζια παιχνίδια", "αθλητικά παπούτσια",
  "εργαλεία μπαταρίας", "καρέκλα γραφείου", "καρότσι μωρού", "ηχεία bluetooth",
  "ψυγείο", "κλιματιστικό", "πλυντήριο πιάτων", "power bank", "δικτυακός εξοπλισμός",
  "iphone", "galaxy", "earbuds", "oled tv", "macbook", "ipad", "playstation", "nintendo switch",
];

/**
 * Skroutz (skroutz.gr): official Skroutz Shopping MCP connector. OAuth per account, so it needs the one-time
 * `node scripts/skroutz-auth.mjs` sign-in; until then the bundled sample deals are shown. Only `search_deals` is ever called.
 */
export const skroutz: Provider = {
  id: "skroutz", name: "Skroutz", kind: "marketplace", homepage: "https://www.skroutz.gr", cart: true, minDeals: 10,
  async fetchDeals({ signal }) {
    const stop = new AbortController();
    const refreshSignal = AbortSignal.any([signal, stop.signal]);
    const client = new McpClient(MCP_URL, { token: await getAccessToken(), signal: refreshSignal });
    try {
      await client.init();
      const results = await mapPool(QUERIES, 4, async query => {
        try {
          const response = await client.callJson<SkResult>("search_deals", { query, limit: 25 });
          return response.success === false ? undefined : response;
        } catch (error) {
          if (error instanceof McpRateLimitError) {
            stop.abort();
            throw error;
          }
          return undefined;
        }
      }, refreshSignal);
      if (!results.length) throw new Error("Every Skroutz deal search failed");
      return parseDeals(results);
    } catch (error) {
      if (error instanceof McpRateLimitError) throw new RateLimitedError(error.retryAfterSec, "Skroutz rate limit");
      throw error;
    }
  },
  seed: () => SKROUTZ_SEED,
};
