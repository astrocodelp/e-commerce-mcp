#!/usr/bin/env node
// One-time Skroutz sign-in (OAuth 2.1: dynamic client registration + PKCE + loopback redirect).
// Run it on YOUR machine, approve the sign-in in the browser, then copy the printed values into your Vercel
// project as Sensitive environment variables. Nothing is written to disk and nothing is committed.
//
//   node scripts/skroutz-auth.mjs
//
// Tip: use a dedicated Skroutz account. The token this creates is only ever used to call `search_deals`.
import http from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { exec } from "node:child_process";

const ISSUER = "https://www.skroutz.gr", MCP = "https://api.skroutz.gr/api/agents/mcp/shopping", SCOPE = "shopping_mcp";
const UA = { "user-agent": "blackfriday-mcp-setup/0.3" };
const b64 = b => b.toString("base64url");

const meta = await (await fetch(`${ISSUER}/.well-known/oauth-authorization-server`, { headers: UA })).json();
const verifier = b64(randomBytes(48)), state = b64(randomBytes(24));

let done, fail;
const result = new Promise((res, rej) => { done = res; fail = rej; });
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://127.0.0.1");
  if (u.pathname !== "/callback") { res.writeHead(404).end(); return; }
  if (u.searchParams.get("state") !== state) { res.writeHead(400).end("State mismatch"); return; }
  const err = u.searchParams.get("error");
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(`<body style="font:16px system-ui;padding:40px"><h3>${err ? "Sign-in cancelled" : "Skroutz connected"}</h3><p>You can close this tab and go back to the terminal.</p></body>`);
  err ? fail(new Error(`Sign-in failed: ${err}`)) : done(u.searchParams.get("code"));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const redirectUri = `http://127.0.0.1:${server.address().port}/callback`;

const reg = await fetch(meta.registration_endpoint, {
  method: "POST", headers: { ...UA, "content-type": "application/json" },
  body: JSON.stringify({ client_name: "Black Friday MCP", redirect_uris: [redirectUri], grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "client_secret_post", scope: SCOPE }),
});
if (!reg.ok) { console.error("Client registration failed:", reg.status, await reg.text()); process.exit(1); }
const { client_id, client_secret } = await reg.json();

const auth = new URL(meta.authorization_endpoint);
auth.search = new URLSearchParams({ response_type: "code", client_id, redirect_uri: redirectUri, scope: SCOPE, state, resource: MCP,
  code_challenge: b64(createHash("sha256").update(verifier).digest()), code_challenge_method: "S256" }).toString();
console.log("\nOpen this URL and approve the sign-in (opening it for you if possible):\n\n" + auth + "\n");
exec(`${process.platform === "darwin" ? "open" : process.platform === "win32" ? "start \"\"" : "xdg-open"} "${auth}"`, () => {});

const timer = setTimeout(() => fail(new Error("Timed out after 5 minutes")), 300_000);
let code;
try { code = await result; } catch (e) { console.error(e.message); process.exit(1); } finally { clearTimeout(timer); server.close(); }

const tok = await fetch(meta.token_endpoint, {
  method: "POST", headers: { ...UA, "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id, client_secret, code_verifier: verifier, resource: MCP }),
});
if (!tok.ok) { console.error("Token exchange failed:", tok.status, await tok.text()); process.exit(1); }
const t = await tok.json();
if (!t.refresh_token) { console.error("Skroutz did not return a refresh token."); process.exit(1); }

console.log(`Done. Add these to your Vercel project as SENSITIVE environment variables (never commit them), then redeploy:

SKROUTZ_CLIENT_ID=${client_id}
SKROUTZ_CLIENT_SECRET=${client_secret}
SKROUTZ_REFRESH_TOKEN=${t.refresh_token}

Also set ADMIN_SECRET (any long random string, e.g. \`openssl rand -hex 24\`). It encrypts the rotating tokens the app stores.
`);
