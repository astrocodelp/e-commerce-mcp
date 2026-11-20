import { PROMPTS, SYSTEM_PROMPT } from "@/lib/agent-copy";
import { CopyButton } from "../copy";
export const metadata = { title: "Prompts: Black Friday MCP" };
export default function Prompts() {
  return (
    <main className="wrap" style={{ padding: "40px 20px 80px", maxWidth: 820 }}>
      <a className="sub" href="/">← Back to deals</a>
      <h1 style={{ fontSize: 44, margin: "18px 0 8px" }}>Prompts for your agent</h1>
      <p className="lede" style={{ fontSize: 16, marginBottom: 24 }}>Copy a prompt, paste it into an agent that has both MCP servers connected.</p>
      <div className="panel" style={{ marginBottom: 14 }}><b>System prompt</b><pre className="code" style={{ margin: "10px 0 0", maxHeight: "none" }}>{SYSTEM_PROMPT}</pre>
        <div className="row"><CopyButton text={SYSTEM_PROMPT} label="Copy to agent" className="btn pri" /></div></div>
      {PROMPTS.map(p => <div className="panel" key={p.id} style={{ marginBottom: 14 }}><b>{p.title}</b><pre className="code" style={{ margin: "10px 0 0", maxHeight: "none" }}>{p.text}</pre>
        <div className="row"><CopyButton text={p.text} label="Copy to agent" className="btn sm" /></div></div>)}
    </main>
  );
}
