# Connect your agent

<!-- Generated from lib/clients.ts by `npm run docs:connect`. Edit that file, not this one. -->

The Black Friday MCP server is open and read-only: Streamable HTTP, no auth. Replace `YOUR-SITE` with your deployment (or use the public one). Add **Skroutz Shopping** too if you want the agent to fill a Skroutz cart. Config formats change, so each section links to the client's own docs.

## Chat apps

### Claude (app / web)

```text
Settings → Connectors → Add custom connector
Name: Black Friday
URL: https://YOUR-SITE.vercel.app/api/mcp

Then add a second one for Skroutz (sign in when asked):
URL: https://api.skroutz.gr/api/agents/mcp/shopping
```

Product cards, the basket and the cart render inline (MCP Apps).

### ChatGPT (GPT)

```text
Settings → Apps & Connectors → Advanced → enable Developer mode
Then Create → MCP server URL:
https://YOUR-SITE.vercel.app/api/mcp
Authentication: None

For Skroutz carts add https://api.skroutz.gr/api/agents/mcp/shopping and sign in with OAuth.
```

Needs Developer mode. Add the same URL as an app / connector; authentication: none.

[Client docs](https://platform.openai.com/docs/guides/developer-mode)

## Coding agents

### Claude Code

```bash
claude mcp add --transport http blackfriday https://YOUR-SITE.vercel.app/api/mcp
claude mcp add --transport http skroutz https://api.skroutz.gr/api/agents/mcp/shopping
```

[Client docs](https://docs.claude.com/en/docs/claude-code/mcp)

### Codex CLI (OpenAI)

File: `~/.codex/config.toml`

```toml
[mcp_servers.blackfriday]
url = "https://YOUR-SITE.vercel.app/api/mcp"

[mcp_servers.skroutz]
url = "https://api.skroutz.gr/api/agents/mcp/shopping"

# or from the shell:
# codex mcp add blackfriday --url https://YOUR-SITE.vercel.app/api/mcp
```

[Client docs](https://developers.openai.com/codex/mcp)

### Cursor

File: `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "blackfriday": {
      "url": "https://YOUR-SITE.vercel.app/api/mcp"
    },
    "skroutz": {
      "url": "https://api.skroutz.gr/api/agents/mcp/shopping"
    }
  }
}
```

[Client docs](https://docs.cursor.com/context/model-context-protocol)

### VS Code (Copilot)

File: `.vscode/mcp.json`

```json
{
  "servers": {
    "blackfriday": {
      "type": "http",
      "url": "https://YOUR-SITE.vercel.app/api/mcp"
    },
    "skroutz": {
      "type": "http",
      "url": "https://api.skroutz.gr/api/agents/mcp/shopping"
    }
  }
}
```

[Client docs](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)

### Windsurf

File: `~/.codeium/windsurf/mcp_config.json`

```json
{
  "mcpServers": {
    "blackfriday": {
      "serverUrl": "https://YOUR-SITE.vercel.app/api/mcp"
    },
    "skroutz": {
      "serverUrl": "https://api.skroutz.gr/api/agents/mcp/shopping"
    }
  }
}
```

[Client docs](https://docs.windsurf.com/windsurf/cascade/mcp)

### Gemini CLI

File: `~/.gemini/settings.json`

```json
{
  "mcpServers": {
    "blackfriday": {
      "httpUrl": "https://YOUR-SITE.vercel.app/api/mcp"
    },
    "skroutz": {
      "httpUrl": "https://api.skroutz.gr/api/agents/mcp/shopping"
    }
  }
}
```

[Client docs](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md)

### Cline

File: `cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "blackfriday": {
      "url": "https://YOUR-SITE.vercel.app/api/mcp",
      "type": "streamableHttp"
    },
    "skroutz": {
      "url": "https://api.skroutz.gr/api/agents/mcp/shopping",
      "type": "streamableHttp"
    }
  }
}
```

[Client docs](https://docs.cline.bot/mcp/configuring-mcp-servers)

### Zed

File: `settings.json`

```json
{
  "context_servers": {
    "blackfriday": {
      "url": "https://YOUR-SITE.vercel.app/api/mcp"
    },
    "skroutz": {
      "url": "https://api.skroutz.gr/api/agents/mcp/shopping"
    }
  }
}
```

[Client docs](https://zed.dev/docs/ai/mcp)

## APIs

### OpenAI API (GPT)

```ts
import OpenAI from "openai";
const client = new OpenAI();

const res = await client.responses.create({
  model: "gpt-5",
  tools: [{ type: "mcp", server_label: "blackfriday", server_url: "https://YOUR-SITE.vercel.app/api/mcp", require_approval: "never" }],
  input: "Find the 3 best Black Friday deals on headphones under €300.",
});
console.log(res.output_text);
```

[Client docs](https://platform.openai.com/docs/guides/tools-remote-mcp)

### Grok (xAI API)

```ts
import OpenAI from "openai"; // xAI's API is OpenAI-compatible
const client = new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: "https://api.x.ai/v1" });

const res = await client.responses.create({
  model: "grok-4",
  tools: [{ type: "mcp", server_label: "blackfriday", server_url: "https://YOUR-SITE.vercel.app/api/mcp" }],
  input: "Find the 3 best Black Friday deals on headphones under €300.",
});
console.log(res.output_text);
```

[Client docs](https://docs.x.ai/docs/guides/tools/remote-mcp-tools)

## Other

### Any stdio-only client

File: `your client's MCP config`

```json
{
  "mcpServers": {
    "blackfriday": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://YOUR-SITE.vercel.app/api/mcp"
      ]
    },
    "skroutz": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://api.skroutz.gr/api/agents/mcp/shopping"
      ]
    }
  }
}
```

Bridges a remote server to clients that only speak stdio, via the mcp-remote package.

### Generic (any MCP client)

File: `your client's MCP config`

```json
{
  "mcpServers": {
    "blackfriday": {
      "type": "http",
      "url": "https://YOUR-SITE.vercel.app/api/mcp"
    },
    "skroutz": {
      "type": "http",
      "url": "https://api.skroutz.gr/api/agents/mcp/shopping"
    }
  }
}
```

Streamable HTTP, no auth for the Black Friday server.

