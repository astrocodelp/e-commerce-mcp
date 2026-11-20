/** Allowlist helpers: the widget only opens/loads URLs on hosts we know. Checked here and again in the widget. */
export function hostIs(url: string, hosts: string[]): boolean {
  try { const u = new URL(url); return u.protocol === "https:" && hosts.some(h => u.hostname === h || u.hostname.endsWith(`.${h}`)); } catch { return false; }
}
export const isSkroutzUrl = (u: string) => hostIs(u, ["skroutz.gr"]);
export const isEbayUrl = (u: string) => hostIs(u, ["ebay.de", "ebay.com"]);
export const isImageUrl = (u: string) => hostIs(u, ["scdn.gr", "pstatic.gr", "ebayimg.com"]);
