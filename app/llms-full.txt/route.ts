import { llmsTxt, PROMPTS, SYSTEM_PROMPT } from "@/lib/agent-copy";
export function GET(req: Request) {
  const o = new URL(req.url).origin;
  const body = `${llmsTxt(o)}\n\n## Recommended system prompt\n\n${SYSTEM_PROMPT}\n\n## Prompt library\n\n${PROMPTS.map(p => `### ${p.title}\n${p.text}`).join("\n\n")}\n`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
