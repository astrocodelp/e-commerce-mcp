// Regenerates docs/CONNECT.md from lib/clients.ts. Run: npm run docs:connect
import { writeFileSync } from "node:fs";
import { CLIENTS } from "../lib/clients";
const URL = "https://YOUR-SITE.vercel.app/api/mcp";
const fence = (k: string) => (k === "json" ? "json" : k === "toml" ? "toml" : k === "command" ? "bash" : k === "code" ? "ts" : "text");
let md = `# Connect your agent\n\n<!-- Generated from lib/clients.ts by \`npm run docs:connect\`. Edit that file, not this one. -->\n\nThe Black Friday MCP server is open and read-only: Streamable HTTP, no auth. Replace \`YOUR-SITE\` with your deployment (or use the public one). Add **Skroutz Shopping** too if you want the agent to fill a Skroutz cart. Config formats change, so each section links to the client's own docs.\n\n`;
for (const g of ["Chat apps", "Coding agents", "APIs", "Other"] as const) {
  md += `## ${g}\n\n`;
  for (const c of CLIENTS.filter(x => x.group === g)) {
    md += `### ${c.label}\n\n${c.file ? `File: \`${c.file}\`\n\n` : ""}\`\`\`${fence(c.kind)}\n${c.body(URL)}\n\`\`\`\n\n${c.note ? `${c.note}\n\n` : ""}${c.docs ? `[Client docs](${c.docs})\n\n` : ""}`;
  }
}
writeFileSync("docs/CONNECT.md", md);
console.log("wrote docs/CONNECT.md");
