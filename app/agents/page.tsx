import { ClientList } from "../connect";
export const metadata = { title: "Connect your agent: Black Friday MCP" };
export default function Agents() {
  return (
    <main className="wrap" style={{ padding: "40px 20px 80px", maxWidth: 820 }}>
      <a className="sub" href="/">← Back to deals</a>
      <h1 style={{ fontSize: 44, margin: "18px 0 10px" }}>Connect your agent</h1>
      <p className="lede" style={{ fontSize: 16 }}>One open MCP server (<code>/api/mcp</code>, Streamable HTTP, no auth, read-only). Add Skroutz Shopping too if you want the agent to fill a Skroutz cart. Config formats change, so each entry links to the client's own docs.</p>
      <ol style={{ color: "var(--muted)", lineHeight: 1.9, paddingLeft: 20, margin: "18px 0 0" }}>
        <li>Read <a href="/llms.txt" style={{ color: "var(--accent)" }}>/llms.txt</a> (agents do this on their own).</li>
        <li>Search with filters and sorting (<code>source</code>, <code>shop</code>, price, discount) and verify each deal at its source.</li>
        <li>Add to a Skroutz cart where possible; hand the link or <code>cart_url</code> to the human, who pays.</li>
      </ol>
      <ClientList />
      <pre className="code" style={{ marginTop: 24 }}>{`GET /api/deals?source=bestprice&shop=Public&max_price=1200&min_discount=20&sort=price_asc&limit=10`}</pre>
    </main>
  );
}
