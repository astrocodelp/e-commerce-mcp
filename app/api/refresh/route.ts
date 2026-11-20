import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { checkSecret } from "@/lib/crypto";

// Forces the next request to rebuild prices from every source now instead of waiting for the hourly revalidation.
export async function POST(req: Request) {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const isForm = (req.headers.get("content-type") ?? "").includes("form");
  const given = bearer ?? (isForm ? String((await req.formData().catch(() => null))?.get("password") ?? "") : "");
  if (!checkSecret(given)) { await new Promise(r => setTimeout(r, 600)); return isForm ? NextResponse.redirect(new URL("/admin?msg=wrong-password", req.url), 303) : NextResponse.json({ error: "unauthorized" }, { status: 401 }); }
  revalidateTag("deals", { expire: 0 });
  return isForm ? NextResponse.redirect(new URL("/admin?msg=refreshing", req.url), 303) : NextResponse.json({ ok: true });
}
