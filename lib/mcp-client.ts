import { UA } from "./http";
// Minimal MCP client (Streamable HTTP, JSON-RPC over fetch). Works with any remote MCP server: pass a bearer
// token for OAuth servers, or nothing for open ones. Only what the deal providers need: initialize + tools/call.
export class McpAuthError extends Error {}
/** The server said 429. `retryAfterSec` comes from its Retry-After header when present. */
export class McpRateLimitError extends Error { constructor(public retryAfterSec: number, msg = "MCP rate limited (429)") { super(msg); } }
type Rpc = { jsonrpc: "2.0"; id?: number; result?: unknown; error?: { code: number; message: string } };
export type McpOptions = { token?: string; headers?: Record<string, string>; signal?: AbortSignal; timeoutMs?: number };

export class McpClient {
  private session?: string; private proto = "2025-06-18"; private n = 1;
  constructor(private url: string, private opts: McpOptions = {}) {}

  private async post(method: string, params: unknown, notify = false): Promise<unknown> {
    const id = notify ? undefined : this.n++;
    const timeout = AbortSignal.timeout(this.opts.timeoutMs ?? 25_000);
    const res = await fetch(this.url, {
      method: "POST", cache: "no-store", signal: this.opts.signal ? AbortSignal.any([this.opts.signal, timeout]) : timeout,
      headers: { ...UA, ...this.opts.headers, "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": this.proto,
        ...(this.opts.token ? { authorization: `Bearer ${this.opts.token}` } : {}), ...(this.session ? { "mcp-session-id": this.session } : {}) },
      body: JSON.stringify({ jsonrpc: "2.0", ...(id ? { id } : {}), method, params }),
    });
    if (res.status === 401 || res.status === 403) throw new McpAuthError(`MCP auth failed (${res.status})`);
    if (res.status === 429) throw new McpRateLimitError(Number(res.headers.get("retry-after")) || 3600);
    if (!res.ok && !notify) throw new Error(`MCP ${method} failed (${res.status})`);
    this.session = res.headers.get("mcp-session-id") ?? this.session;
    if (notify) return null;
    const text = await res.text();
    const msgs: Rpc[] = (res.headers.get("content-type") ?? "").includes("text/event-stream")
      ? text.split(/\r?\n\r?\n/).map(b => b.split(/\r?\n/).filter(l => l.startsWith("data:")).map(l => l.slice(5).trim()).join("")).filter(Boolean).map(s => JSON.parse(s) as Rpc)
      : [JSON.parse(text) as Rpc];
    const msg = msgs.find(m => m.id === id) ?? msgs[0];
    if (!msg) throw new Error(`MCP ${method}: empty response`);
    if (msg.error) throw new Error(`MCP ${method}: ${msg.error.message}`);
    return msg.result;
  }

  async init() {
    const r = (await this.post("initialize", { protocolVersion: this.proto, capabilities: {}, clientInfo: { name: "blackfriday-mcp", version: "0.4.0" } })) as { protocolVersion?: string };
    if (r?.protocolVersion) this.proto = r.protocolVersion;
    await this.post("notifications/initialized", {}, true);
  }
  /** Calls a tool and returns its JSON payload (structuredContent when present, else the parsed text content). */
  async callJson<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
    const r = (await this.post("tools/call", { name, arguments: args })) as { isError?: boolean; structuredContent?: unknown; content?: { type: string; text?: string }[] };
    const text = r.content?.find(c => c.type === "text")?.text ?? "";
    if (r.isError) throw new Error(`tool ${name} failed: ${text.slice(0, 120)}`);
    return (r.structuredContent ?? JSON.parse(text)) as T;
  }
}
