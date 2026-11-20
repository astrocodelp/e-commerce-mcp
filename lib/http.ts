export const UA = { "user-agent": "blackfriday-mcp/0.4 (+https://github.com/astrocodelp/e-commerce-mcp)" };

/** Runs `fn` over `items` with limited concurrency; stops starting new work once `signal` aborts. */
export async function mapPool<T, R>(items: T[], size: number, fn: (item: T, i: number) => Promise<R>, signal?: AbortSignal): Promise<NonNullable<R>[]> {
  const out: (R | undefined)[] = []; let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length && !signal?.aborted) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out.filter((x): x is NonNullable<R> => x !== undefined && x !== null);
}
