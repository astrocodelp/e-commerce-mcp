import { getSnapshot } from "@/lib/deals-source";
import { Shell } from "./shell";
export default async function Home() {
  const snap = await getSnapshot();
  return (
    <>
      <Shell initial={snap} />
      <footer className="foot"><div className="wrap">
        <div className="cols">
          <div><h3>For agents</h3><ul>
            <li><a href="/llms.txt">/llms.txt</a> · <a href="/llms-full.txt">/llms-full.txt</a></li>
            <li><a href="/.well-known/mcp.json">/.well-known/mcp.json</a></li>
            <li><a href="/api/deals?sort=price_asc&limit=5">/api/deals</a> · <a href="/api/status">/api/status</a></li></ul></div>
          <div><h3>MCP tools</h3><ul>
            <li><code>search_deals</code> filters + sorting</li><li><code>compare_deals</code> · <code>get_deal</code></li>
            <li><code>list_sources</code> · <code>list_categories</code> · <code>list_brands</code> · <code>list_shops</code></li>
            <li><code>list_campaigns</code> · <code>build_shopping_plan</code> · <code>get_freshness</code></li></ul></div>
          <div><h3>Buying</h3><ul>
            <li>Verify with each source's own tools</li><li>Skroutz carts via <code>add_to_cart</code></li>
            <li><a href="/agents">Agent quickstart →</a></li><li><a href="/prompts">Prompt library →</a></li></ul></div>
        </div>
        <p className="fine">Independent project. Deal data comes from Skroutz and BestPrice and can change at any time; always confirm the live price at the shop before paying. Not affiliated with Skroutz or BestPrice.</p>
      </div></footer>
    </>
  );
}
