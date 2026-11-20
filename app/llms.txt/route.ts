import { llmsTxt } from "@/lib/agent-copy";
export function GET(req: Request) {
  return new Response(llmsTxt(new URL(req.url).origin), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
