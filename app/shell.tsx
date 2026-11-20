"use client";
import { useEffect, useMemo, useState } from "react";
import { Connect } from "./connect";
import { Explorer } from "./explorer";
import { overall, type Snapshot } from "@/lib/types";

function ago(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 45) return "just now"; const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}
export function Shell({ initial }: { initial: Snapshot }) {
  const [snap, setSnap] = useState(initial); const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now()); const clock = setInterval(() => setNow(Date.now()), 20_000);
    const pull = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/deals?limit=500"); if (!r.ok) return; const j = await r.json();
        setSnap(prev => (j.updatedAt && j.updatedAt !== prev.updatedAt && Array.isArray(j.deals) && j.deals.length ? { updatedAt: j.updatedAt, sources: j.sources ?? prev.sources, deals: j.deals, campaigns: j.campaigns ?? prev.campaigns } : prev));
      } catch {}
    };
    const poll = setInterval(pull, 300_000); document.addEventListener("visibilitychange", pull);
    return () => { clearInterval(clock); clearInterval(poll); document.removeEventListener("visibilitychange", pull); };
  }, []);
  const st = overall(snap.sources); const live = st === "live";
  const label = { live: "Live", cached: "Cached", sample: "Sample data", error: "Offline" }[st];
  const detail = snap.sources.map(x => `${x.name}: ${x.status}, ${x.count} deals`).join("\n");
  const stats = useMemo(() => ({ n: snap.deals.length, c: new Set(snap.deals.map(d => d.category)).size, top: Math.max(0, ...snap.deals.map(d => d.discountPct)) }), [snap.deals]);
  return (
    <>
      <header className="hdr"><div className="wrap">
        <a className="logo" href="#top"><i>BF</i>Black Friday MCP</a><div className="spacer" />
        <nav className="nav" aria-label="Primary"><a href="#deals">Deals</a><a href="/prompts">Prompts</a><a href="/llms.txt">llms.txt</a></nav>
        <span className="live" title={`${detail}\nUpdated ${new Date(snap.updatedAt).toLocaleString()}`}><span className={`dot${live ? "" : " warn"}`} aria-hidden /><span>{label}</span><span className="t num">· {now ? ago(now - Date.parse(snap.updatedAt)) : "synced"}</span></span>
      </div></header>
      <main className="wrap" id="top">
        <section className="hero">
          <div>
            <span className="eyebrow">Agent-first · Deals for Greece</span>
            <h1>Black Friday, <em>built for agents.</em></h1>
            <p className="lede">Compare deals from {snap.sources.map(x => x.name).join(", ")} in one MCP. Your agent can find offers, check current prices and fill a Skroutz cart. You handle checkout.</p>
            <div className="stats">
              <div className="stat"><b className="num">{stats.n}</b><span>{live ? "live deals" : "deals"}</span></div>
              <div className="stat"><b className="num">{stats.c}</b><span>categories</span></div>
              <div className="stat"><b className="num">{snap.sources.length}</b><span>{snap.sources.length === 1 ? "source" : "sources"}</span></div>
              <div className="stat"><b className="num">−{stats.top}%</b><span>top discount</span></div>
            </div>
          </div>
          <Connect />
        </section>
        <section className="steps" aria-label="How it works">
          <div className="step"><small>01 DISCOVER</small><b>Search live deals</b><p>Filter and sort by price, discount or € saved through this MCP.</p></div>
          <div className="step"><small>02 VERIFY</small><b>Check at the source</b><p>Each deal says how to verify it with its own source's tools.</p></div>
          <div className="step"><small>03 CART</small><b>Fill the cart</b><p>Where the source supports it, add_to_cart builds the basket and returns a cart_url.</p></div>
          <div className="step"><small>04 PAY</small><b>You confirm</b><p>Agents never pay. Checkout stays with you.</p></div>
        </section>
        <Explorer snap={snap} />
      </main>
    </>
  );
}
