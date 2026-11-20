import { createHash } from "node:crypto";
import { UA } from "../../http";
import { readAuth, writeAuth, type Auth } from "../../store";

export const MCP_URL = "https://api.skroutz.gr/api/agents/mcp/shopping";
const TOKEN_FALLBACK = "https://www.skroutz.gr/oauth2/token";
export class NotConnectedError extends Error { constructor() { super("Skroutz is not connected (set SKROUTZ_CLIENT_ID, SKROUTZ_CLIENT_SECRET, SKROUTZ_REFRESH_TOKEN)"); } }

async function tokenEndpoint() {
  try {
    const r = await fetch("https://www.skroutz.gr/.well-known/oauth-authorization-server", { headers: UA, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (r.ok) return ((await r.json()) as { token_endpoint?: string }).token_endpoint ?? TOKEN_FALLBACK;
  } catch {}
  return TOKEN_FALLBACK;
}
type Tokens = { access_token: string; refresh_token?: string; expires_in?: number };
async function refresh(a: Auth): Promise<Tokens> {
  const r = await fetch(await tokenEndpoint(), {
    method: "POST", headers: { ...UA, "content-type": "application/x-www-form-urlencoded" }, cache: "no-store", signal: AbortSignal.timeout(15_000),
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: a.refreshToken, client_id: a.clientId, client_secret: a.clientSecret, resource: MCP_URL }),
  });
  if (!r.ok) throw new Error(`Skroutz token refresh failed (${r.status}); re-run scripts/skroutz-auth.mjs and update the env vars`);
  return (await r.json()) as Tokens;
}

/**
 * Credentials come from env (printed once by scripts/skroutz-auth.mjs). Skroutz may rotate the refresh token on
 * every use, so the newest one is kept in an AES-GCM encrypted blob and wins until the env token is replaced.
 */
async function loadAuth(): Promise<Auth | null> {
  const { SKROUTZ_CLIENT_ID: clientId, SKROUTZ_CLIENT_SECRET: clientSecret, SKROUTZ_REFRESH_TOKEN: envToken } = process.env;
  const stored = await readAuth();
  if (clientId && clientSecret && envToken) {
    const seedHash = createHash("sha256").update(envToken).digest("hex").slice(0, 16);
    if (!stored || stored.seedHash !== seedHash) return { clientId, clientSecret, refreshToken: envToken, connectedAt: new Date().toISOString(), seedHash };
  }
  return stored;
}

let inflight: Promise<string> | null = null;
/** A valid access token, refreshed (and the rotated refresh token re-saved) when needed. */
export function getAccessToken(): Promise<string> {
  return (inflight ??= (async () => {
    try {
      const a = await loadAuth(); if (!a) throw new NotConnectedError();
      if (a.accessToken && a.expiresAt && a.expiresAt > Date.now() + 60_000) return a.accessToken;
      const t = await refresh(a);
      const next: Auth = { ...a, accessToken: t.access_token, refreshToken: t.refresh_token ?? a.refreshToken, expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000 };
      await writeAuth(next).catch(e => console.error("[skroutz] could not persist rotated token:", e instanceof Error ? e.message : e));
      return next.accessToken!;
    } finally { setTimeout(() => (inflight = null), 0); }
  })());
}
