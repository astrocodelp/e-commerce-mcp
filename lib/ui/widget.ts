import { CATEGORY_LABELS } from "../types";

// The MCP App (UI) rendered inline by hosts that support MCP Apps (SEP-1865), e.g. Claude, VS Code, Goose.
// One self-contained HTML document, no external scripts. It talks to the host over postMessage JSON-RPC:
//   ui/initialize, ui/notifications/tool-result (data in), ui/message + ui/open-link (actions out).
// Also works with the ChatGPT Apps SDK bridge (window.openai) when that is what the host provides.
// Everything from tool results is rendered with textContent (never innerHTML) and links are host-allowlisted.
export const WIDGET_URI = "ui://blackfriday/deals.html";
export const WIDGET_URI_OPENAI = "ui://blackfriday/deals-skybridge.html";
export const WIDGET_MIME = "text/html;profile=mcp-app";
export const WIDGET_MIME_OPENAI = "text/html+skybridge";
/** Image CDNs the widget may load from (Skroutz, BestPrice and eBay product images). */
export const WIDGET_CSP = { resourceDomains: ["https://*.pstatic.gr", "https://*.scdn.gr", "https://*.ebayimg.com"], connectDomains: [] as string[] };

export const WIDGET_HTML = String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><title>Black Friday MCP</title>
<style>
:root{--text:#f5f5f6;--muted:#a3a3ad;--faint:#7a7a86;--surface:#16161a;--surface2:#1d1d23;--line:rgba(255,255,255,.1);--accent:#ffd23f;--ink:#1a1405;--good:#4ade80;--r:14px;--ease:cubic-bezier(.23,1,.32,1)}
html[data-theme=light]{--text:#17171a;--muted:#5b5b66;--faint:#85858f;--surface:#fff;--surface2:#f3f3f5;--line:rgba(0,0,0,.12);--accent:#f5b800;--good:#15803d}
*{box-sizing:border-box}html,body{margin:0}
body{font:14px/1.45 ui-sans-serif,-apple-system,"SF Pro Text",system-ui,sans-serif;color:var(--text);background:transparent;-webkit-font-smoothing:antialiased;padding:12px}
.num{font-variant-numeric:tabular-nums}
button{font:inherit;color:inherit;cursor:pointer}
.bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.bar h2{margin:0;font-size:15px;letter-spacing:-.01em;flex:1;min-width:140px}.bar small{color:var(--muted);font-weight:400}
.controls{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.controls label{flex:1 1 120px;min-width:0;color:var(--muted);font-size:12px}.controls select{display:block;width:100%;min-height:36px;margin-top:3px;padding:0 8px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--text);font:inherit;color-scheme:dark}html[data-theme=light] select{color-scheme:light}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%, 205px),1fr));gap:10px}
.card{display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid var(--line);border-radius:var(--r);background:var(--surface);animation:rise .38s var(--ease) both;animation-delay:calc(var(--i)*26ms)}
@keyframes rise{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}
.img{height:104px;border-radius:10px;background:#fff;display:grid;place-items:center;overflow:hidden;position:relative}
.img img{max-width:100%;max-height:100%;object-fit:contain}
.mono{width:100%;height:100%;display:grid;place-items:center;font-weight:800;font-size:26px;color:rgba(255,255,255,.92)}
.badge{position:absolute;top:6px;right:6px;background:rgba(22,163,74,.95);color:#fff;font-weight:700;font-size:12px;border-radius:999px;padding:2px 8px}
.title{font-weight:600;font-size:13px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.6em}
.meta{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:11.5px;color:var(--faint)}
.src{padding:1px 7px;border-radius:999px;font-weight:700;background:var(--surface2);color:var(--muted)}
.src.ebay{background:rgba(115,195,134,.16);color:var(--good)}
.src.skroutz{background:rgba(255,120,60,.16);color:#ff8c57}.src.bestprice{background:rgba(70,140,255,.16);color:#5b9bff}
.price{display:flex;align-items:baseline;gap:7px;flex-wrap:wrap}.price b{font-size:20px;letter-spacing:-.03em}.price s{color:var(--faint);font-size:12px}
.sub{font-size:11.5px;color:var(--muted)}.sub .g{color:var(--good);font-weight:600}
.acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:34px;padding:0 12px;border-radius:9px;border:1px solid var(--line);background:var(--surface2);font-weight:600;font-size:13px;text-decoration:none;color:var(--text);flex:1;transition:transform .16s var(--ease),background-color .16s var(--ease),border-color .16s var(--ease)}
.btn.pri{background:var(--accent);color:var(--ink);border-color:transparent}
.btn.on{background:rgba(74,222,128,.14);border-color:rgba(74,222,128,.5);color:var(--good)}
.btn.ghost{background:transparent;flex:0 0 auto}
.btn.lg{min-height:44px;font-size:14.5px;border-radius:11px}
@media (hover:hover) and (pointer:fine){.btn:hover{border-color:var(--muted)}.btn.pri:hover{filter:brightness(1.06)}}
.fab{flex-wrap:wrap;position:sticky;bottom:0;margin-top:12px;display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);box-shadow:0 8px 24px -12px rgba(0,0,0,.5);animation:rise .3s var(--ease) both}
.fab span{flex:1;font-weight:600}.fab .btn{flex:0 0 auto}
.group{border:1px solid var(--line);border-radius:var(--r);background:var(--surface);padding:12px;margin-bottom:10px}
.gh{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-weight:700}.gh small{color:var(--muted);font-weight:500;flex:1}
.line{display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line)}
.line:first-of-type{border-top:0}
.line .thumb{width:46px;height:46px;border-radius:9px;background:#fff;display:grid;place-items:center;overflow:hidden;flex:none}.line .thumb img{max-width:100%;max-height:100%;object-fit:contain}.line .thumb .mono{font-size:15px}
.line .t{flex:1;min-width:0}.line .t b{display:block;font-size:13px;font-weight:600;line-height:1.3;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.line .p{font-weight:700;text-align:right;white-space:nowrap}.line .x{border:0;background:none;color:var(--faint);font-size:18px;line-height:1;padding:4px 6px;border-radius:6px}
.total{display:flex;justify-content:space-between;align-items:baseline;padding:10px 2px 4px;font-size:15px}.total b{font-size:22px;letter-spacing:-.03em}
.note{font-size:12px;color:var(--faint);margin:8px 2px 0}
.empty{padding:28px 12px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:var(--r)}
.toast{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);background:var(--text);color:var(--surface);padding:8px 14px;border-radius:999px;font-weight:600;font-size:13px;animation:rise .25s var(--ease) both}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
</style></head>
<body><div id="app"></div>
<script>
(function () {
  "use strict";
  var app = document.getElementById("app");
  var state = { view: "deals", deals: [], items: [], cart: null, cartUrl: null, total: 0, source: "", category: "", sort: "", basket: Object.create(null), toast: "" };
  var skroutzHosts = ["skroutz.gr"], linkHosts = ["skroutz.gr", "bestprice.gr", "ebay.de", "ebay.com"], imgHosts = ["scdn.gr", "pstatic.gr", "ebayimg.com"];

  // ---------- helpers ----------
  function hostOk(url, hosts) {
    try { var u = new URL(url); return u.protocol === "https:" && hosts.some(function (h) { return u.hostname === h || u.hostname.endsWith("." + h); }); } catch (e) { return false; }
  }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k]; if (v == null || v === false) return;
      if (k === "class") n.className = v; else if (k === "text") n.textContent = v;
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function eur(n) { try { return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: n % 1 ? 2 : 0 }).format(n); } catch (e) { return "€" + n; } }
  function hue(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  function mono(brand) { var h = hue(brand || "?"); var m = el("div", { class: "mono", text: (brand || "?").slice(0, 2) }); m.style.background = "linear-gradient(135deg,hsl(" + h + " 62% 36%),hsl(" + ((h + 38) % 360) + " 66% 24%))"; return m; }
  function picture(d, cls) {
    var box = el("div", { class: cls });
    if (d.imageUrl && hostOk(d.imageUrl, imgHosts)) {
      var img = el("img", { src: d.imageUrl, alt: "", loading: "lazy", referrerpolicy: "no-referrer" });
      img.addEventListener("error", function () { box.replaceChildren(mono(d.brand)); }); box.appendChild(img);
    } else box.appendChild(mono(d.brand));
    return box;
  }
  function baseline(d) { return d.baseline === "median_180d" ? "180-day median" : "previous price"; }
  var sourceNames = { skroutz: "Skroutz", bestprice: "BestPrice", ebay: "eBay" };
  var categoryNames = ${JSON.stringify(CATEGORY_LABELS)};
  function srcName(d) { return sourceNames[d.source] || d.source; }
  function toast(msg) { state.toast = msg; render(); setTimeout(function () { if (state.toast === msg) { state.toast = ""; render(); } }, 2200); }

  // ---------- host bridge (MCP Apps JSON-RPC, with ChatGPT window.openai fallback) ----------
  var pending = {}, nextId = 1;
  function post(msg) { window.parent.postMessage(msg, "*"); }
  function request(method, params) {
    return new Promise(function (res, rej) {
      var id = nextId++; pending[id] = { res: res, rej: rej }; post({ jsonrpc: "2.0", id: id, method: method, params: params || {} });
      setTimeout(function () { if (pending[id]) { delete pending[id]; rej(new Error("timeout")); } }, 8000);
    });
  }
  function notify(method, params) { post({ jsonrpc: "2.0", method: method, params: params || {} }); }
  function openLink(url) {
    if (!hostOk(url, linkHosts)) return toast("Blocked an unexpected link");
    if (window.openai && window.openai.openExternal) return void window.openai.openExternal({ href: url });
    request("ui/open-link", { url: url }).catch(function () { try { window.open(url, "_blank", "noopener"); } catch (e) { copy(url, "Link copied"); } });
  }
  function askAgent(text, fallbackLabel) {
    if (window.openai && window.openai.sendFollowUpMessage) return void window.openai.sendFollowUpMessage({ prompt: text });
    request("ui/message", { role: "user", content: [{ type: "text", text: text }] }).then(function () { toast("Sent to your assistant"); }).catch(function () { copy(text, fallbackLabel || "Request copied. Paste it to your assistant"); });
  }
  function copy(text, msg) { try { navigator.clipboard.writeText(text).then(function () { toast(msg); }, function () { toast("Copy blocked by the host"); }); } catch (e) { toast("Copy blocked by the host"); } }
  function applyHost(ctx) {
    if (!ctx) return;
    var t = ctx.theme || (ctx.styles && ctx.styles.theme); if (t) document.documentElement.setAttribute("data-theme", t === "light" ? "light" : "dark");
  }
  window.addEventListener("message", function (e) {
    if (e.source !== window.parent) return;
    var m = e.data; if (!m || m.jsonrpc !== "2.0") return;
    if (m.id != null && !m.method) { var p = pending[m.id]; if (p) { delete pending[m.id]; if (m.error) p.rej(new Error(m.error.message)); else p.res(m.result); } return; }
    if (m.method === "ui/notifications/tool-result") onResult(m.params);
    else if (m.method === "ui/notifications/host-context-changed") applyHost(m.params);
    else if (m.method === "ui/resource-teardown" && m.id != null) post({ jsonrpc: "2.0", id: m.id, result: {} });
  });
  window.addEventListener("openai:set_globals", function () { if (window.openai && window.openai.toolOutput) onResult({ structuredContent: window.openai.toolOutput }); });

  // ---------- data in ----------
  function onResult(r) {
    var s = r && (r.structuredContent || r); if (!s || typeof s !== "object") return;
    if (s.view === "deals" && Array.isArray(s.deals)) {
      state.deals = s.deals; state.total = s.total == null ? s.deals.length : s.total; state.view = "deals";
      state.source = ""; state.category = ""; state.sort = "";
    } else if (s.view === "basket" || s.view === "cart") {
      state.items = Array.isArray(s.items) ? s.items : []; state.cart = s.skroutzCart || null; state.view = s.view;
      state.cartUrl = s.cartUrl && hostOk(s.cartUrl, skroutzHosts) ? s.cartUrl : null;
      if (s.view === "basket") { state.basket = Object.create(null); state.items.forEach(function (d) { state.basket[d.id] = d; }); }
    } else return;
    render();
  }
  function basketList() { return Object.keys(state.basket).map(function (k) { return state.basket[k]; }); }
  function toggle(d) { if (state.basket[d.id]) delete state.basket[d.id]; else state.basket[d.id] = d; render(); }

  // ---------- views ----------
  function dealCard(d, i) {
    var linkLabel = d.source === "skroutz" && d.url && d.url.indexOf("https://www.skroutz.gr/search?") === 0 ? "Find on Skroutz" : "Open offer";
    var on = !!state.basket[d.id];
    var img = picture(d, "img"); img.appendChild(el("span", { class: "badge num", text: "−" + d.discountPct + "%" }));
    return el("article", { class: "card", style: "--i:" + Math.min(i, 12) }, [
      img, el("div", { class: "title", text: d.title }),
      el("div", { class: "meta" }, [el("span", { class: "src " + d.source, text: srcName(d) }), d.shop ? el("span", { text: "from " + d.shop }) : null]),
      el("div", { class: "price num" }, [el("b", { text: eur(d.price) }), el("s", { text: eur(d.oldPrice) })]),
      el("div", { class: "sub num" }, [document.createTextNode("Save "), el("span", { class: "g", text: eur(+(d.oldPrice - d.price).toFixed(2)) }), document.createTextNode(" vs " + baseline(d))]),
      el("div", { class: "acts" }, [
        el("button", { class: "btn " + (on ? "on" : "pri"), "aria-pressed": String(on), text: on ? "✓ In basket" : "Add to basket", onclick: function () { toggle(d); } }),
        el("button", { class: "btn ghost", title: linkLabel, "aria-label": linkLabel, text: "↗", onclick: function () { openLink(d.url); } }),
      ]),
    ]);
  }
  function filterSelect(key, label, options) {
    var select = el("select", { id: key, onchange: function (event) {
      state[key] = event.target.value;
      render();
      document.getElementById(key).focus();
    } }, options.map(function (option) {
      return el("option", { value: option[0], text: option[1], selected: state[key] === option[0] });
    }));
    return el("label", {}, [label, select]);
  }
  function dealOptions(key, first, labels) {
    var values = Array.from(new Set(state.deals.map(function (d) { return d[key]; }).filter(Boolean)));
    return [["", first]].concat(values.map(function (value) {
      return [value, labels[value] || value.replace(/-/g, " ")];
    }).sort(function (a, b) { return a[1].localeCompare(b[1]); }));
  }
  function dealsView() {
    var root = el("div");
    var deals = state.deals.filter(function (d) {
      return (!state.source || d.source === state.source) && (!state.category || d.category === state.category);
    });
    if (state.sort) deals.sort(function (a, b) {
      if (state.sort === "price_asc") return a.price - b.price;
      if (state.sort === "price_desc") return b.price - a.price;
      if (state.sort === "savings") return (b.oldPrice - b.price) - (a.oldPrice - a.price);
      return b.discountPct - a.discountPct;
    });
    root.appendChild(el("div", { class: "bar" }, [el("h2", {}, ["Deals ", el("small", {
      class: "num", role: "status", text: deals.length + " shown" + (state.total > deals.length ? " of " + state.total + " matches" : ""),
    })])]));
    if (state.deals.length) root.appendChild(el("div", { class: "controls" }, [
      filterSelect("source", "Source", dealOptions("source", "All sources", sourceNames)),
      filterSelect("category", "Category", dealOptions("category", "All categories", categoryNames)),
      filterSelect("sort", "Sort by", [["", "Result order"], ["discount", "Biggest discount"], ["price_asc", "Lowest price"], ["price_desc", "Highest price"], ["savings", "Most saved"]]),
    ]));
    root.appendChild(deals.length ? el("div", { class: "grid" }, deals.map(dealCard)) : el("div", { class: "empty", text: "No deals match. Try a broader search." }));
    var items = basketList();
    if (items.length) {
      var total = items.reduce(function (n, d) { return n + d.price; }, 0);
      root.appendChild(el("div", { class: "fab" }, [el("span", { class: "num", text: items.length + (items.length === 1 ? " item · " : " items · ") + eur(total) }),
        el("button", { class: "btn pri", text: "View basket →", onclick: function () { state.view = "basket"; render(); } })]));
    }
    return root;
  }
  function skroutzPrompt(list) {
    return "Add these Skroutz products to my cart with the Skroutz Shopping connector. First check each price with get_product (skip any that now cost more than the price in brackets), then add them all in one add_to_cart call: " +
      list.map(function (d) { return "sku_id " + (d.sku_id || d.nativeId) + " – " + d.title + " (max " + eur(d.price) + ")"; }).join("; ") +
      ". Then call show_basket with the cart_url from add_to_cart so I can open my cart. Do not pay.";
  }
  function line(d, removable) {
    return el("div", { class: "line" }, [picture(d, "thumb"),
      el("div", { class: "t" }, [el("b", { text: d.title }), el("div", { class: "meta" }, [el("span", { class: "src " + d.source, text: srcName(d) }), d.shop ? el("span", { text: d.shop }) : null])]),
      el("div", { class: "p num", text: eur(d.price) }),
      removable ? el("button", { class: "x", title: "Remove", "aria-label": "Remove " + d.title, text: "×", onclick: function () { delete state.basket[d.id]; render(); } }) : null]);
  }
  function basketView() {
    var root = el("div"); var items = basketList();
    var back = state.deals.length ? el("button", { class: "chip", text: "← Deals", onclick: function () { state.view = "deals"; render(); } }) : null;
    root.appendChild(el("div", { class: "bar" }, [el("h2", {}, ["Your basket ", el("small", { class: "num", text: items.length + (items.length === 1 ? " item" : " items") })]), back]));
    if (!items.length) { root.appendChild(el("div", { class: "empty", text: "Your basket is empty. Add deals from the list." })); return root; }
    var groups = Object.create(null); items.forEach(function (d) { (groups[d.source] = groups[d.source] || []).push(d); });
    Object.keys(groups).forEach(function (src) {
      var list = groups[src], sum = list.reduce(function (n, d) { return n + d.price; }, 0), isSk = src === "skroutz";
      var g = el("section", { class: "group" }, [el("div", { class: "gh" }, [el("span", { class: "src " + src, text: srcName(list[0]) }), el("small", { text: isSk ? "can fill your Skroutz cart" : "no cart here: open each offer" }), el("span", { class: "num", text: eur(sum) })])]);
      list.forEach(function (d) { g.appendChild(line(d, true)); });
      if (isSk) {
        g.appendChild(el("div", { class: "acts", style: "margin-top:10px" }, state.cartUrl
          ? [el("button", { class: "btn pri lg", text: "Go to Skroutz cart & pay →", onclick: function () { openLink(state.cartUrl); } })]
          : [el("button", { class: "btn pri lg", text: "Add " + list.length + (list.length === 1 ? " item" : " items") + " to my Skroutz cart", onclick: function () { askAgent(skroutzPrompt(list)); } }),
             el("button", { class: "btn ghost lg", title: "Copy request", "aria-label": "Copy request", text: "⧉", onclick: function () { copy(skroutzPrompt(list), "Request copied"); } })]));
      } else {
        g.appendChild(el("div", { class: "acts", style: "margin-top:10px;flex-wrap:wrap" }, list.map(function (d) { return el("button", { class: "btn", text: "Open " + (d.shop || srcName(d)) + " offer ↗", onclick: function () { openLink(d.url); } }); })));
      }
      root.appendChild(g);
    });
    var total = items.reduce(function (n, d) { return n + d.price; }, 0), was = items.reduce(function (n, d) { return n + d.oldPrice; }, 0);
    root.appendChild(el("div", { class: "total num" }, [el("span", { text: "Total" }), el("b", { text: eur(+total.toFixed(2)) })]));
    root.appendChild(el("div", { class: "sub num", style: "padding:0 2px" }, [document.createTextNode("You save "), el("span", { class: "g", text: eur(+(was - total).toFixed(2)) }), document.createTextNode(" vs previous / median prices")]));
    root.appendChild(el("p", { class: "note", text: "Prices were checked a moment ago and can change. You confirm and pay on the shop's own site; nothing is bought from here." }));
    return root;
  }
  function cartView() {
    var root = el("div"), c = state.cart || { items: [] }, lines = c.items || [];
    root.appendChild(el("div", { class: "bar" }, [el("h2", {}, ["Your Skroutz cart ", el("small", { class: "num", text: lines.length + (lines.length === 1 ? " item" : " items") })])]));
    var g = el("section", { class: "group" });
    if (!lines.length) g.appendChild(el("div", { class: "empty", text: "The cart is empty." }));
    lines.forEach(function (it) {
      var d = { imageUrl: it.imageUrl, brand: (it.title || "?").split(" ")[0] };
      g.appendChild(el("div", { class: "line" }, [picture(d, "thumb"), el("div", { class: "t" }, [el("b", { text: it.title }), el("div", { class: "meta", text: it.quantity > 1 ? "Qty " + it.quantity : "" })]),
        el("div", { class: "p num", text: it.price != null ? eur(+(it.price * (it.quantity || 1)).toFixed(2)) : "" })]));
    });
    root.appendChild(g);
    if (c.total != null) root.appendChild(el("div", { class: "total num" }, [el("span", { text: "Estimated total" }), el("b", { text: eur(c.total) })]));
    if (state.cartUrl) root.appendChild(el("div", { class: "acts", style: "margin-top:10px" }, [el("button", { class: "btn pri lg", text: "Go to Skroutz cart & pay →", onclick: function () { openLink(state.cartUrl); } })]));
    root.appendChild(el("p", { class: "note", text: "Shipping and final price are confirmed on Skroutz at checkout. You complete the payment there." }));
    return root;
  }
  function render() {
    var view = state.view === "basket" ? basketView() : state.view === "cart" ? cartView() : dealsView();
    app.replaceChildren(view); if (state.toast) app.appendChild(el("div", { class: "toast", role: "status", text: state.toast }));
    reportSize();
  }
  var lastH = 0;
  function reportSize() { var h = Math.ceil(document.documentElement.getBoundingClientRect().height); if (h !== lastH) { lastH = h; notify("ui/notifications/size-changed", { width: Math.ceil(document.documentElement.scrollWidth), height: h }); } }
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(reportSize).observe(document.body);

  // ---------- start ----------
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) document.documentElement.setAttribute("data-theme", "light");
  render();
  request("ui/initialize", { protocolVersion: "2026-01-26", appInfo: { name: "blackfriday-mcp-deals", version: "0.5.0" }, appCapabilities: {} })
    .then(function (r) { applyHost(r && r.hostContext); notify("ui/notifications/initialized"); })
    .catch(function () { notify("ui/notifications/initialized"); });
  if (window.openai && window.openai.toolOutput) onResult({ structuredContent: window.openai.toolOutput });
})();
</script></body></html>`;
