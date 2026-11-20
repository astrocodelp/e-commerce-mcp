/**
 * Setup snippets for every agent / client we know how to connect. Data-driven: the home page panel, /agents and
 * docs/CONNECT.md all come from this list. To add a client, add one entry. Config formats change, so each entry
 * links to the client's own docs.
 */
export const SKROUTZ_URL = "https://api.skroutz.gr/api/agents/mcp/shopping";
export type ClientKind = "command" | "json" | "toml" | "code" | "steps";
export type Client = { id: string; label: string; group: "Chat apps" | "Coding agents" | "APIs" | "Other"; kind: ClientKind; file?: string; note?: string; docs?: string; body: (url: string) => string };

const j = (o: unknown) => JSON.stringify(o, null, 2);
const both = (url: string, key: (u: string) => unknown) => ({ blackfriday: key(url), skroutz: key(SKROUTZ_URL) });

export const CLIENTS: Client[] = [
  { id: "claude-code", label: "Claude Code", group: "Coding agents", kind: "command", docs: "https://docs.claude.com/en/docs/claude-code/mcp",
    body: u => `claude mcp add --transport http blackfriday ${u}\nclaude mcp add --transport http skroutz ${SKROUTZ_URL}` },
  { id: "claude", label: "Claude (app / web)", group: "Chat apps", kind: "steps", note: "Product cards, the basket and the cart render inline (MCP Apps).",
    body: u => `Settings → Connectors → Add custom connector\nName: Black Friday\nURL: ${u}\n\nThen add a second one for Skroutz (sign in when asked):\nURL: ${SKROUTZ_URL}` },
  { id: "chatgpt", label: "ChatGPT (GPT)", group: "Chat apps", kind: "steps", docs: "https://platform.openai.com/docs/guides/developer-mode",
    note: "Needs Developer mode. Add the same URL as an app / connector; authentication: none.",
    body: u => `Settings → Apps & Connectors → Advanced → enable Developer mode\nThen Create → MCP server URL:\n${u}\nAuthentication: None\n\nFor Skroutz carts add ${SKROUTZ_URL} and sign in with OAuth.` },
  { id: "codex", label: "Codex CLI (OpenAI)", group: "Coding agents", kind: "toml", file: "~/.codex/config.toml", docs: "https://developers.openai.com/codex/mcp",
    body: u => `[mcp_servers.blackfriday]\nurl = "${u}"\n\n[mcp_servers.skroutz]\nurl = "${SKROUTZ_URL}"\n\n# or from the shell:\n# codex mcp add blackfriday --url ${u}` },
  { id: "openai-api", label: "OpenAI API (GPT)", group: "APIs", kind: "code", docs: "https://platform.openai.com/docs/guides/tools-remote-mcp",
    body: u => `import OpenAI from "openai";\nconst client = new OpenAI();\n\nconst res = await client.responses.create({\n  model: "gpt-5",\n  tools: [{ type: "mcp", server_label: "blackfriday", server_url: "${u}", require_approval: "never" }],\n  input: "Find the 3 best Black Friday deals on headphones under €300.",\n});\nconsole.log(res.output_text);` },
  { id: "grok", label: "Grok (xAI API)", group: "APIs", kind: "code", docs: "https://docs.x.ai/docs/guides/tools/remote-mcp-tools",
    body: u => `import OpenAI from "openai"; // xAI's API is OpenAI-compatible\nconst client = new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: "https://api.x.ai/v1" });\n\nconst res = await client.responses.create({\n  model: "grok-4",\n  tools: [{ type: "mcp", server_label: "blackfriday", server_url: "${u}" }],\n  input: "Find the 3 best Black Friday deals on headphones under €300.",\n});\nconsole.log(res.output_text);` },
  { id: "cursor", label: "Cursor", group: "Coding agents", kind: "json", file: ".cursor/mcp.json", docs: "https://docs.cursor.com/context/model-context-protocol",
    body: u => j({ mcpServers: both(u, x => ({ url: x })) }) },
  { id: "vscode", label: "VS Code (Copilot)", group: "Coding agents", kind: "json", file: ".vscode/mcp.json", docs: "https://code.visualstudio.com/docs/copilot/customization/mcp-servers",
    body: u => j({ servers: both(u, x => ({ type: "http", url: x })) }) },
  { id: "windsurf", label: "Windsurf", group: "Coding agents", kind: "json", file: "~/.codeium/windsurf/mcp_config.json", docs: "https://docs.windsurf.com/windsurf/cascade/mcp",
    body: u => j({ mcpServers: both(u, x => ({ serverUrl: x })) }) },
  { id: "gemini", label: "Gemini CLI", group: "Coding agents", kind: "json", file: "~/.gemini/settings.json", docs: "https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md",
    body: u => j({ mcpServers: both(u, x => ({ httpUrl: x })) }) },
  { id: "cline", label: "Cline", group: "Coding agents", kind: "json", file: "cline_mcp_settings.json", docs: "https://docs.cline.bot/mcp/configuring-mcp-servers",
    body: u => j({ mcpServers: both(u, x => ({ url: x, type: "streamableHttp" })) }) },
  { id: "zed", label: "Zed", group: "Coding agents", kind: "json", file: "settings.json", docs: "https://zed.dev/docs/ai/mcp",
    body: u => j({ context_servers: both(u, x => ({ url: x })) }) },
  { id: "mcp-remote", label: "Any stdio-only client", group: "Other", kind: "json", file: "your client's MCP config", note: "Bridges a remote server to clients that only speak stdio, via the mcp-remote package.",
    body: u => j({ mcpServers: both(u, x => ({ command: "npx", args: ["-y", "mcp-remote", x] })) }) },
  { id: "generic", label: "Generic (any MCP client)", group: "Other", kind: "json", file: "your client's MCP config", note: "Streamable HTTP, no auth for the Black Friday server.",
    body: u => j({ mcpServers: both(u, x => ({ type: "http", url: x })) }) },
];
export const clientById = (id: string) => CLIENTS.find(c => c.id === id) ?? CLIENTS[0];
