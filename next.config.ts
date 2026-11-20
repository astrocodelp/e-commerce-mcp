import type { NextConfig } from "next";

const config: NextConfig = {
  // Cache Components: `"use cache"` + cacheLife/cacheTag, with ISR-style stale-while-revalidate.
  cacheComponents: true,
  cacheLife: {
    // Deal prices (every source): serve cached for up to 1h, then refresh in the background on the next request.
    deals: { stale: 300, revalidate: 3600, expire: 86400 },
  },
  async headers() {
    return [
      { source: "/(.*)", headers: [{ key: "Link", value: '</llms.txt>; rel="llms-txt", </.well-known/mcp.json>; rel="mcp-server-card", </api/mcp>; rel="mcp"' }] },
      { source: "/:path(llms.txt|llms-full.txt|.well-known/mcp.json)", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }] },
    ];
  },
};
export default config;
