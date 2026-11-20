import { Suspense } from "react";
import { getSnapshot } from "@/lib/deals-source";
import { readAuth } from "@/lib/store";

export const metadata = { title: "Admin: Black Friday MCP", robots: { index: false, follow: false } };
const MSG: Record<string, string> = {
  refreshing: "Refresh requested. The next page load rebuilds prices from every source.", "wrong-password": "Wrong password.",
};

async function Status({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const [auth, snap] = await Promise.all([readAuth(), getSnapshot()]);
  const configured = !!process.env.ADMIN_SECRET;
  
  return (
    <>
      {msg && MSG[msg] && <p className="camp" role="status"><span style={{ padding: "10px 14px", border: "1px dashed rgba(255,210,63,.35)", borderRadius: 12 }}>{MSG[msg]}</span></p>}
      <div className="panel" style={{ marginBottom: 14, display: "grid", gap: 10 }}>
        {snap.sources.map(x => (
          <p className="sub" key={x.id}><span className={`src src-${x.id}`}>{x.name}</span>{" "}
            <b style={{ color: "var(--text)" }}>{x.status}</b> · <span className="num">{x.count}</span> deals{x.updatedAt ? ` · fetched ${x.updatedAt.slice(0, 16).replace("T", " ")} UTC` : ""}
            {x.id === "skroutz" ? ` · account ${auth ? "connected" : "not connected"}` : ""}</p>
        ))}
        <p className="hint">live = fetched this cycle · cached = the last good snapshot (a refresh failed or was rate limited) · sample = bundled data (never fetched yet)</p>
      </div>
      {!configured && <p className="sub">Set the <code>ADMIN_SECRET</code> environment variable in Vercel and redeploy to enable this page.</p>}
      {configured && !auth && snap.sources.some(x => x.id === "skroutz") && (
        <div className="panel" style={{ marginBottom: 14 }}><b>Connect Skroutz (optional)</b>
          <p className="sub" style={{ marginTop: 8 }}>Run <code>node scripts/skroutz-auth.mjs</code> on your machine, approve the sign-in, then add the three printed <code>SKROUTZ_*</code> values to Vercel as Sensitive env vars and redeploy. Use a dedicated Skroutz account.</p></div>
      )}
      {configured && (
        <div className="panel">
          <form method="post" action="/api/refresh" style={{ display: "grid", gap: 10 }}>
            <label className="fld"><span>Password</span><input name="password" type="password" required autoComplete="current-password" style={{ width: "100%", textAlign: "left" }} /></label>
            <div className="row"><button className="btn pri" type="submit">Refresh prices now</button></div>
            <p className="hint">Prices refresh automatically (Skroutz about hourly, BestPrice every 6h). This forces a rebuild of every source on the next page load.</p>
          </form>
        </div>
      )}
    </>
  );
}
export default function Admin(props: { searchParams: Promise<{ msg?: string }> }) {
  return (
    <main className="wrap" style={{ padding: "40px 20px 80px", maxWidth: 640 }}>
      <a className="sub" href="/">← Back to deals</a>
      <h1 style={{ fontSize: 40, margin: "18px 0 20px" }}>Admin</h1>
      <Suspense fallback={<p className="sub">Loading…</p>}><Status searchParams={props.searchParams} /></Suspense>
    </main>
  );
}
