import { del, list, put } from "@vercel/blob";
import { seal, unseal } from "./crypto";
import type { Campaign, Deal } from "./types";

// Public blob URL is derived from the store id embedded in the token: vercel_blob_rw_<storeId>_<secret>
const base = () => {
  const id = process.env.BLOB_READ_WRITE_TOKEN?.split("_")[3];
  return id ? `https://${id.toLowerCase()}.public.blob.vercel-storage.com` : null;
};

/** Last good snapshot per provider (public blob `deals/<id>.json`), used when a refresh fails. */
type Stored = { updatedAt: string; deals: Deal[]; campaigns: Campaign[] };
export async function readProviderBlob(id: string): Promise<Stored | null> {
  const b = base(); if (!b) return null;
  const get = async (path: string) => { try { const r = await fetch(`${b}/${path}`, { cache: "no-store" }); return r.ok ? ((await r.json()) as Stored) : null; } catch { return null; } };
  const s = await get(`deals/${id}.json`);
  if (s?.deals?.length) return s;
  // One-time migration: the pre-provider snapshot (Skroutz only, numeric sku ids).
  if (id === "skroutz") {
    const old = await get("deals.json");
    if (old?.deals?.length) return { ...old, deals: old.deals.map(d => { const x = d as unknown as { sku_id: number }; return { ...d, id: `skroutz:${x.sku_id}`, source: "skroutz", nativeId: String(x.sku_id), baseline: "previous_price" as const,
      verify: `Skroutz Shopping connector: get_product(sku_id=${x.sku_id}) then add_to_cart` }; }) };
  }
  return null;
}
export async function writeProviderBlob(id: string, s: Stored) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  await put(`deals/${id}.json`, JSON.stringify(s), { access: "public", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
}

/** OAuth credentials: AES-GCM encrypted, stored under an unguessable blob path. */
export type Auth = { clientId: string; clientSecret: string; refreshToken: string; accessToken?: string; expiresAt?: number; connectedAt: string; seedHash?: string };
export async function readAuth(): Promise<Auth | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN || !process.env.ADMIN_SECRET) return null;
  try {
    const { blobs } = await list({ prefix: "auth/" });
    const latest = blobs.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))[0]; if (!latest) return null;
    const r = await fetch(latest.url, { cache: "no-store" }); if (!r.ok) return null;
    return unseal<Auth>((await r.text()).trim());
  } catch { return null; }
}
export async function writeAuth(a: Auth) {
  const { blobs } = await list({ prefix: "auth/" });
  await put("auth/skroutz.enc", seal(a), { access: "public", contentType: "text/plain", addRandomSuffix: true });
  if (blobs.length) await del(blobs.map(b => b.url));
}
