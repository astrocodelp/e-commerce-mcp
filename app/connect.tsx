"use client";
import { useEffect, useState } from "react";
import { CopyButton } from "./copy";
import { SYSTEM_PROMPT } from "@/lib/agent-copy";
import { CLIENTS, clientById } from "@/lib/clients";

const BRIEF = "brief";
/** Home page panel: pick your agent, copy its setup. */
export function Connect() {
  const [id, setId] = useState("claude-code");
  const [origin, setOrigin] = useState("https://blackfriday-mcp.vercel.app");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/api/mcp`;
  const brief = `Read ${origin}/llms.txt first. Connect to the Black Friday MCP at ${url} (Streamable HTTP, no auth) and the Skroutz Shopping connector (OAuth).\n\n${SYSTEM_PROMPT}`;
  const c = id === BRIEF ? null : clientById(id);
  const text = c ? c.body(url) : brief;
  return (
    <div className="panel" id="connect">
      <label className="fld pick"><span>Connect</span>
        <select value={id} onChange={e => setId(e.target.value)} aria-label="Choose your agent">
          {(["Chat apps", "Coding agents", "APIs", "Other"] as const).map(g => <optgroup key={g} label={g}>{CLIENTS.filter(x => x.group === g).map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</optgroup>)}
          <optgroup label="Prompt"><option value={BRIEF}>Agent brief (any chat)</option></optgroup>
        </select>
      </label>
      {c?.file && <p className="hint file">{c.file}</p>}
      <pre className="code" tabIndex={0}>{text}</pre>
      {c?.note && <p className="hint" style={{ marginTop: 8 }}>{c.note}</p>}
      <div className="row"><CopyButton text={text} label={id === BRIEF ? "Copy to agent" : "Copy"} className="btn pri" />
        <a className="hint" href="/agents" style={{ textDecoration: "underline" }}>All agents &amp; JSON configs →</a></div>
    </div>
  );
}

/** /agents page: every client at once. */
export function ClientList() {
  const [origin, setOrigin] = useState("https://blackfriday-mcp.vercel.app");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/api/mcp`;
  return (
    <div style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(0, 1fr)" }}>
      {(["Chat apps", "Coding agents", "APIs", "Other"] as const).map(g => (
        <section key={g}><h2 style={{ fontSize: 20, margin: "22px 0 10px" }}>{g}</h2>
          {CLIENTS.filter(x => x.group === g).map(x => (
            <div className="panel" key={x.id} id={x.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}><b>{x.label}</b>
                {x.file && <span className="hint file">{x.file}</span>}<span style={{ flex: 1 }} />
                {x.docs && <a className="hint" href={x.docs} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>docs ↗</a>}</div>
              <pre className="code" tabIndex={0} style={{ margin: "10px 0 0" }}>{x.body(url)}</pre>
              {x.note && <p className="hint" style={{ marginTop: 8 }}>{x.note}</p>}
              <div className="row"><CopyButton text={x.body(url)} className="btn sm" /></div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
