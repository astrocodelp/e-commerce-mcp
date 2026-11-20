"use client";
import { useRef, useState } from "react";
const Copy = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>;
const Check = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>;
export function CopyButton({ text, label = "Copy", doneLabel = "Copied", className = "btn sm" }: { text: string; label?: string; doneLabel?: string; className?: string }) {
  const [done, setDone] = useState(false); const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  return (
    <button type="button" className={className} onClick={async () => {
      try { await navigator.clipboard.writeText(text); } catch { return; }
      setDone(true); clearTimeout(t.current); t.current = setTimeout(() => setDone(false), 1600);
    }}>
      <span className={`cp${done ? " done" : ""}`}><span className="off"><Copy />{label}</span><span className="on"><Check />{doneLabel}</span></span>
    </button>
  );
}
