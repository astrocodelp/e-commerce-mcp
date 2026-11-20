"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { facets, filterDeals, SORTS, type Sort } from "@/lib/query";
import { categoryLabel, eur, type Deal, type Snapshot } from "@/lib/types";
import { CopyButton } from "./copy";

const SORT_LABEL: Record<Sort, string> = { discount: "Biggest discount", price_asc: "Price ↑", price_desc: "Price ↓", savings: "Most € saved" };
const SORT_SHORT: Record<Sort, string> = { discount: "Discount", price_asc: "Price ↑", price_desc: "Price ↓", savings: "€ saved" };
const DISCOUNTS = [0, 10, 20, 30, 40];
const hue = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const Search = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;

function DealCard({ d, i, fresh, source }: { d: Deal; i: number; fresh: boolean; source: string }) {
  const h = hue(d.brand); const [bad, setBad] = useState(false);
  const prompt = `Verify deal ${d.id} ("${d.title}"). ${d.verify ?? ""} If the price is ${eur(d.price)} or less${d.verify?.includes("add_to_cart") ? ", add_to_cart, then" : ", then"} stop before payment and give me the ${d.verify?.includes("add_to_cart") ? "cart_url" : "link"}.`;
  const base = d.baseline === "median_180d" ? "180-day median" : "previous price";
  return (
    <article className={`card${fresh ? " in" : ""}`} style={{ "--i": Math.min(i, 14) } as React.CSSProperties}>
      <div className="top">
        {d.imageUrl && !bad
          // eslint-disable-next-line @next/next/no-img-element
          ? <img className="thumb" src={d.imageUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" width={42} height={42} onError={() => setBad(true)} />
          : <div className="mono" style={{ background: `linear-gradient(135deg,hsl(${h} 62% 36%),hsl(${(h + 38) % 360} 66% 24%))` }} aria-hidden>{d.brand.slice(0, 2)}</div>}
        <div className="meta"><small>{categoryLabel(d.category)}</small><b>{d.brand}</b></div>
        <span className="badge num">−{d.discountPct}%</span>
      </div>
      <h3 className="title">{d.title}</h3>
      <div className="pr num"><b>{eur(d.price)}</b><s title={`Was ${eur(d.oldPrice)} (${base})`}>{eur(d.oldPrice)}</s></div>
      <p className="save num">Save {eur(+(d.oldPrice - d.price).toFixed(2))} <span className="faint">vs {base}</span></p>
      <p className="via"><span className={`src src-${d.source}`}>{source}</span>{d.shop ? <span>from {d.shop}</span> : null}</p>
      <div className="acts">
        <a className="btn sm pri" href={d.url} target="_blank" rel="noopener noreferrer">{source} ↗</a>
        <CopyButton text={prompt} label="Ask agent" doneLabel="Copied" className="btn sm ghost" />
      </div>
    </article>
  );
}

export function Explorer({ snap }: { snap: Snapshot }) {
  const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [brand, setBrand] = useState(""); const [src, setSrc] = useState(""); const [shop, setShop] = useState("");
  const [min, setMin] = useState(""); const [max, setMax] = useState(""); const [disc, setDisc] = useState(0); const [sort, setSort] = useState<Sort>("discount");
  const [ready, setReady] = useState(false); const [fresh, setFresh] = useState(true); const input = useRef<HTMLInputElement>(null);

  useEffect(() => { // read filters from the URL once
    const p = new URLSearchParams(window.location.search);
    setQ(p.get("q") ?? ""); setCat(p.get("category") ?? ""); setBrand(p.get("brand") ?? ""); setSrc(p.get("source") ?? ""); setShop(p.get("shop") ?? ""); setMin(p.get("min_price") ?? ""); setMax(p.get("max_price") ?? "");
    setDisc(Number(p.get("min_discount") ?? 0) || 0); const s = p.get("sort") as Sort; if (SORTS.includes(s)) setSort(s);
    setReady(true); const t = setTimeout(() => setFresh(false), 900); return () => clearTimeout(t);
  }, []);
  useEffect(() => { // keep the URL shareable
    if (!ready) return; const p = new URLSearchParams();
    if (q) p.set("q", q); if (cat) p.set("category", cat); if (brand) p.set("brand", brand); if (src) p.set("source", src); if (shop) p.set("shop", shop); if (min) p.set("min_price", min); if (max) p.set("max_price", max);
    if (disc) p.set("min_discount", String(disc)); if (sort !== "discount") p.set("sort", sort);
    const qs = p.toString(); history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [ready, q, cat, brand, src, shop, min, max, disc, sort]);
  useEffect(() => { // "/" focuses search
    const f = (e: KeyboardEvent) => { const t = e.target as HTMLElement; if (e.key === "/" && !/INPUT|SELECT|TEXTAREA/.test(t.tagName)) { e.preventDefault(); input.current?.focus(); } };
    window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f);
  }, []);

  const f = useMemo(() => facets(snap.deals, snap.sources), [snap.deals, snap.sources]);
  const names = useMemo(() => Object.fromEntries(snap.sources.map(x => [x.id, x.name])), [snap.sources]);
  const num = (v: string) => (v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : undefined);
  const list = useMemo(() => filterDeals(snap.deals, { q, category: cat || undefined, brand: brand || undefined, source: src || undefined, shop: shop || undefined, minPrice: num(min), maxPrice: num(max), minDiscount: disc || undefined, sort }),
    [snap.deals, q, cat, brand, src, shop, min, max, disc, sort]);
  const dirty = !!(q || cat || brand || src || shop || min || max || disc || sort !== "discount");
  const reset = () => { setQ(""); setCat(""); setBrand(""); setSrc(""); setShop(""); setMin(""); setMax(""); setDisc(0); setSort("discount"); };

  return (
    <section id="deals" aria-label="Deals">
      <div className="sec-h">
        <div><h2>Deals</h2><p className="sub" style={{ marginTop: 8 }}>{f.sources.length > 1 ? `From ${snap.sources.map(x => x.name).join(" and ")}. ` : ""}Filter, sort, then hand any deal to your agent.</p></div>
      </div>
      {snap.campaigns.length > 0 && <div className="camp">{snap.campaigns.map(c => <div key={c.id}><b>{c.title}</b><span className="sub">{c.description}</span></div>)}</div>}
      <div className="stick">
        <label className="srch"><Search />
          <input ref={input} value={q} onChange={e => setQ(e.target.value)} placeholder="Search deals, brands or products" aria-label="Search deals" type="search" enterKeyHint="search" autoComplete="off" />
          <kbd aria-hidden>/</kbd></label>
        <div className="chips" role="group" aria-label="Category">
          <button className="chip" aria-pressed={cat === ""} onClick={() => setCat("")}>All<i className="num">{snap.deals.length}</i></button>
          {f.categories.map(c => <button key={c.key} className="chip" aria-pressed={cat === c.key} onClick={() => setCat(cat === c.key ? "" : c.key)}>{categoryLabel(c.key)}<i className="num">{c.count}</i></button>)}
        </div>
      </div>
      <div className="filters">
          {f.sources.length > 1 && <div className="seg" role="group" aria-label="Source"><button aria-pressed={src === ""} onClick={() => setSrc("")}>All sources</button>{f.sources.map(x => <button key={x.key} aria-pressed={src === x.key} onClick={() => setSrc(src === x.key ? "" : x.key)}>{x.name}<i className="num segn">{x.count}</i></button>)}</div>}
          {f.shops.length > 0 && <label className="fld">Shop<select value={shop} onChange={e => setShop(e.target.value)} aria-label="Shop"><option value="">All</option>{f.shops.map(b => <option key={b.key} value={b.key}>{b.key} ({b.count})</option>)}</select></label>}
          <label className="fld">Brand<select value={brand} onChange={e => setBrand(e.target.value)} aria-label="Brand"><option value="">All</option>{f.brands.map(b => <option key={b.key} value={b.key}>{b.key} ({b.count})</option>)}</select></label>
          <label className="fld">€<input className="num" inputMode="decimal" placeholder={String(f.minPrice)} value={min} onChange={e => setMin(e.target.value)} aria-label="Minimum price" />–<input className="num" inputMode="decimal" placeholder={String(f.maxPrice)} value={max} onChange={e => setMax(e.target.value)} aria-label="Maximum price" /></label>
          <div className="seg" role="group" aria-label="Minimum discount">{DISCOUNTS.map(v => <button key={v} aria-pressed={disc === v} onClick={() => setDisc(v)}>{v === 0 ? "Any" : `${v}%+`}</button>)}</div>
          <div className="seg" role="group" aria-label="Sort by">{SORTS.map(s => <button key={s} aria-pressed={sort === s} onClick={() => setSort(s)} title={SORT_LABEL[s]}>{SORT_SHORT[s]}</button>)}</div>
          {dirty && <button className="btn sm ghost" onClick={reset}>Reset</button>}
      </div>
      <p className="count num" aria-live="polite"><b style={{ color: "var(--text)" }}>{list.length}</b> {list.length === 1 ? "deal" : "deals"}{dirty ? ` of ${snap.deals.length}` : ""}</p>
      {list.length === 0
        ? <div className="empty"><b>Nothing matches</b>Try widening the price range or lowering the discount.<div style={{ marginTop: 16 }}><button className="btn sm" onClick={reset}>Reset filters</button></div></div>
        : <div className="grid">{list.map((d, i) => <DealCard key={d.id} d={d} i={i} fresh={fresh} source={names[d.source] ?? d.source} />)}</div>}
    </section>
  );
}
