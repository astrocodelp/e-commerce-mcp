export function GET(req: Request) {
  const o = new URL(req.url).origin;
  return Response.json({ name: "blackfriday-mcp", description: "Black Friday deals for Greece from multiple sources (Skroutz, BestPrice), agent-first.",
    version: "0.5.0", transport: { type: "streamable-http", url: `${o}/api/mcp` }, auth: "none", ui: "mcp-apps",
    tools: ["search_deals", "get_deal", "compare_deals", "list_sources", "list_categories", "list_brands", "list_shops", "list_campaigns", "get_freshness", "build_shopping_plan", "show_basket", "get_agent_instructions"],
    companions: [{ name: "Skroutz Shopping", url: "https://api.skroutz.gr/api/agents/mcp/shopping", auth: "oauth", cart: true }, { name: "BestPrice", url: "https://mcp.bestprice.gr/mcp", auth: "none", cart: false }], llms: `${o}/llms.txt` },
    { headers: { "Access-Control-Allow-Origin": "*" } });
}
