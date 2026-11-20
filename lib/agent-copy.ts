export const SITE = "Black Friday MCP";
export const MCP_PATH = "/api/mcp";
export const SYSTEM_PROMPT = `You are a Black Friday shopping agent for Greece.
1. DISCOVER deals with the "Black Friday MCP" server (tools: search_deals, get_deal, compare_deals, list_sources, list_categories, list_brands, list_shops, list_campaigns, get_freshness, build_shopping_plan, show_basket).
2. VERIFY every candidate with the source's own tools, as given in the deal's 'verify' hint (Skroutz: the official "Skroutz Shopping" connector's get_product; BestPrice: compare_offers / get_price_history). The source's live price is the truth.
3. ACT only where the source allows it: for Skroutz deals use add_to_cart and get_cart on the Skroutz Shopping connector. Sources with cart=false (see list_sources), such as BestPrice, are read-only: give the user the link.
4. SHOW the user what you found: search_deals renders product cards (with images and an add-to-basket button) in clients that support MCP Apps. When they pick items, call show_basket with the deal ids. After a Skroutz add_to_cart, call show_basket again with the returned cart_url (and the get_cart items as skroutz_cart) so the user gets a 'Go to Skroutz cart & pay' button.
5. NEVER complete payment. Stop at a prepared cart and hand the user the checkout link. Ask for explicit confirmation before any add_to_cart that exceeds the user's budget.
6. Report: item, verified price, shop, savings vs. the old price (and its baseline), and total vs. budget.`;
export const PROMPTS = [
  { id: "best-deals", title: "Find the best Black Friday deals", text: "Use the Black Friday MCP server. Call search_deals (sort: discount, price_asc, price_desc or savings; filters: category, brand, min/max price, min discount) for <category>, then verify the top 5 with each deal's own source tools (see its verify hint) and show me a table of verified price, discount, source and shop." },
  { id: "budget-cart", title: "Fill a cart within a budget", text: "My budget is <EUR> and I want: <item 1>, <item 2>, <item 3>. Call build_shopping_plan on the Black Friday MCP server, verify each pick using its verify hint, add verified Skroutz picks with add_to_cart and show get_cart, and give me the links for the rest. Do not pay." },
  { id: "gift-list", title: "Gift list under €X", text: "Find 5 gift ideas under <EUR> each from Black Friday MCP (use search_deals with max_price and sort=discount across audio, smartwatches and smartphones). Verify them, add my favourite two to the cart where possible and stop." },
  { id: "price-check", title: "Is this really a deal?", text: "Take <product>. Call get_deal and compare_deals on Black Friday MCP, then check the live price with the source's own tools (see the deal's verify hint). Tell me if the discount is real and what its baseline is." },
];
export const llmsTxt = (origin: string) => `# ${SITE}

> Agent-first aggregator of Black Friday deals for Greece from several sources (Skroutz, BestPrice, more to come), exposed as a remote MCP server. Discover deals here, verify them with each source's own tools, and add to cart where the source supports it. Payment is always left to the human.

## Connect (MCP)
- Streamable HTTP endpoint (stateless): ${origin}${MCP_PATH}
- Server card: ${origin}/.well-known/mcp.json
- Auth: none for discovery tools (read-only).
- Claude Code: \`claude mcp add --transport http blackfriday ${origin}${MCP_PATH}\`
- Companion connector (needed to fill a Skroutz cart): Skroutz Shopping — https://api.skroutz.gr/api/agents/mcp/shopping (OAuth sign-in by the user). BestPrice (https://mcp.bestprice.gr/mcp) is open and read-only.

## Tools
- search_deals(query?, category?, brand?, source?, shop?, min_price?, max_price?, min_discount?, sort?: discount|price_asc|price_desc|savings, limit?, offset?)
- get_deal(id)  ('<source>:<id>', e.g. skroutz:60478236)
- compare_deals(ids[])
- list_sources()  (live/cached status and whether the source can fill a cart)
- list_categories()
- list_brands()
- list_shops()  (retailers some sources report, e.g. Plaisio, Kotsovolos)
- list_campaigns()
- get_freshness()
- build_shopping_plan(budget, wishlist[])
- show_basket(ids?, cart_url?, skroutz_cart?, images?)  (renders a basket / cart UI with a go-to-cart button; never buys)
- get_agent_instructions()

## UI (MCP Apps)
- search_deals, get_deal, compare_deals, build_shopping_plan and show_basket return structured data and render a widget (product images, add-to-basket, basket, cart) in hosts that support MCP Apps. Other clients get the same data as JSON text.
- The widget cannot pay or touch the user's real cart: its Add-to-cart button asks the assistant to use the Skroutz Shopping connector, and the final button opens the Skroutz cart for the user to pay.

## Freshness
- Prices are fetched from each source (Skroutz via its official connector, BestPrice via its public MCP) and cached at the edge; Skroutz refreshes about hourly; BestPrice every 6 hours (its free tier is rate limited). Each deal states its 'baseline': 'previous_price' (the merchant's earlier price) or 'median_180d' (BestPrice's 180-day median). Every response carries updatedAt. Call get_freshness if it matters.

## Rules for agents
- Every deal has a 'source' and a 'verify' hint. Confirm the live price with the source's own tools before presenting it as fact.
- Never complete payment. Prepare the cart and give the user the checkout link.
- Respect the user's budget; ask before exceeding it.

## Docs
- [Agent prompts & copy blocks](${origin}/prompts)
- [Agent page](${origin}/agents)
- [Full instructions](${origin}/llms-full.txt)
- [Deals JSON](${origin}/api/deals) — filters: q, category, brand, source, shop, min_price, max_price, min_discount, sort, limit, offset
- [Feed status](${origin}/api/status)
`;
