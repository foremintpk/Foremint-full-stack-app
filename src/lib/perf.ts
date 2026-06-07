/**
 * @file src/lib/perf.ts
 * @description Lightweight timing instrumentation. EVIDENCE-ONLY — no behavior change.
 * Wrap any awaited call: `await time('label', () => somePromise())`.
 * Logs `[perf] <label> = <ms>` to the server console (and pushes to a per-request
 * span list when running inside withRequestTrace()).
 */
import { performance } from 'node:perf_hooks';

export type Span = { label: string; ms: number };

const REQ = globalThis as unknown as { __perfSpans?: Span[] };

export async function time<T>(label: string, fn: () => PromiseLike<T>): Promise<T> {
  const t = performance.now();
  try {
    return await fn();
  } finally {
    const ms = +(performance.now() - t).toFixed(1);
    REQ.__perfSpans?.push({ label, ms });
    // eslint-disable-next-line no-console
    console.log(`[perf] ${label} = ${ms}ms`);
  }
}

/** Begin collecting spans for one logical request; returns a printer. */
export function beginTrace(name: string): () => void {
  REQ.__perfSpans = [];
  const t0 = performance.now();
  return () => {
    const total = +(performance.now() - t0).toFixed(1);
    const spans = REQ.__perfSpans ?? [];
    // eslint-disable-next-line no-console
    console.log(`\n[trace] ${name}\n` + spans.map((s) => `  ├─ ${s.label} ${'.'.repeat(Math.max(2, 30 - s.label.length))} ${s.ms}ms`).join('\n') + `\n  Total: ${total}ms\n`);
    REQ.__perfSpans = undefined;
  };
}
