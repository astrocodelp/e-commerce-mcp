import { McpClient } from "../../mcp-client";
import { mapPool } from "../../http";
import type { Provider } from "../types";
import { getAccessToken } from "./oauth";
import { parseDeals, QUERIES, type SkResult } from "./parse";
import { SKROUTZ_SEED } from "./seed";

export const MCP_URL = "https://api.skroutz.gr/api/agents/mcp/shopping";

/**
 * Skroutz (skroutz.gr): official Skroutz Shopping MCP connector. OAuth per account, so it needs the one-time
 * `node scripts/skroutz-auth.mjs` sign-in; until then the bundled sample deals are shown. Only `search_deals` is ever called.
 */
export const skroutz: Provider = {
  id: "skroutz", name: "Skroutz", kind: "marketplace", homepage: "https://www.skroutz.gr", cart: true, minDeals: 10,
  async fetchDeals({ signal }) {
    const client = new McpClient(MCP_URL, { token: await getAccessToken(), signal });
    await client.init();
    const results: SkResult[] = []; let failures = 0;
    await mapPool(QUERIES, 5, async q => {
      try { const r = await client.callJson<SkResult>("search_deals", { query: q, limit: 25 }); if (r.success !== false) results.push(r); else failures++; }
      catch { failures++; }
    }, signal);
    if (!results.length) throw new Error(`every search_deals call failed (${failures})`);
    return parseDeals(results);
  },
  seed: () => SKROUTZ_SEED,
};
