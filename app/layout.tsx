import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
export const metadata: Metadata = {
  title: "Black Friday MCP: live Skroutz deals for AI agents",
  description: "Live Black Friday deals from Skroutz, served as a remote MCP server with llms.txt and copy-ready prompts. Find, verify, fill the cart. You press pay.",
  other: { "mcp-server": "/api/mcp", "llms-txt": "/llms.txt" },
  alternates: { types: { "text/plain": "/llms.txt" } },
};
export const viewport: Viewport = { themeColor: "#08080a", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
