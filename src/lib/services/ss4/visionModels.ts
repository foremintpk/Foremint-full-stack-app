/**
 * @file src/lib/services/ss4/visionModels.ts
 * @description Model fallback policy for the vision gateway.
 *
 * Split out from vision.ts because that module is marked `server-only`, which
 * makes it unimportable from a test runner. These two functions are pure
 * decision logic with no network or credential access, so they live here and
 * can be tested directly.
 */

/**
 * Models tried in order when the configured one is unavailable.
 *
 * The gateway returns 503 "this model is temporarily unavailable" for a model
 * that is down rather than for a request that is malformed, and retrying the
 * same model through that window just burns the retry budget — which is what
 * made a read fail outright instead of degrading. Each entry is a separate
 * model family so a provider-side outage on one does not take the rest with it.
 *
 * Ordered by capability: Opus is preferred, Sonnet is the first fallback, and
 * Haiku is accepted as still good enough to read a filing rather than fail the
 * extraction entirely.
 */
export const FALLBACK_MODELS = [
  'claude-opus-5',
  'claude-sonnet-5',
  'claude-haiku-4-5-20251001',
];

/**
 * Build the ordered list of models to try, starting from whichever one is
 * configured. The configured model always goes first even if it is not in the
 * fallback list, so an administrator's explicit choice is still honoured.
 */
export function buildModelChain(configured: string): string[] {
  const chain = [configured];
  for (const candidate of FALLBACK_MODELS) {
    if (!chain.includes(candidate)) chain.push(candidate);
  }
  return chain;
}

/**
 * Whether the error says "this particular model is unavailable" rather than
 * "the request failed". Those are worth answering by switching models
 * immediately; a generic rate-limit is better answered by waiting.
 */
export function isModelUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b503\b|model is (temporarily )?(down|unavailable)|no (available )?(provider|endpoint)|overloaded|capacity/i.test(
    message
  );
}
