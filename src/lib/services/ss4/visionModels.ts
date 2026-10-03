/**
 * @file src/lib/services/ss4/visionModels.ts
 * @description Model, credential and fallback policy for the vision client.
 *
 * Split out from vision.ts because that module is marked `server-only`, which
 * makes it unimportable from a test runner. These functions are pure decision
 * logic with no network or credential access, so they live here and can be
 * tested directly.
 */

/**
 * The model document reads run on. Sonnet is the right tier for this work:
 * reading a filing or an ID is perception plus a short JSON reply, not deep
 * reasoning, and it costs a fraction of Opus.
 */
export const DEFAULT_VISION_MODEL = 'claude-sonnet-5-5';

/**
 * Models tried in order when the configured one is unavailable.
 *
 * A model that is overloaded (529) or down (503) answers every retry the same
 * way, so retrying it through that window just burns the retry budget — which
 * is what once made a read fail outright instead of degrading. Each entry is a
 * separate model with its own capacity, so an outage on one does not take the
 * rest with it.
 *
 * Opus is the first fallback because it is the most capable and is only paid
 * for while Sonnet is down; Haiku is accepted as still good enough to read a
 * filing rather than fail the extraction entirely.
 */
export const FALLBACK_MODELS = [
  DEFAULT_VISION_MODEL,
  'claude-opus-5-5',
  'claude-haiku-4-5',
];

/**
 * The model to read documents with. ANTHROPIC_MODEL overrides the default so
 * the model can be changed without a code change; the ss4_settings.vision_model
 * column is deliberately not consulted, because it still holds the model name
 * from the previous provider.
 */
export function configuredVisionModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_VISION_MODEL;
}

/**
 * Build the ordered list of models to try, starting from whichever one is
 * configured. The configured model always goes first even if it is not in the
 * fallback list, so an explicit override is still honoured.
 */
export function buildModelChain(configured: string): string[] {
  const chain = [configured];
  for (const candidate of FALLBACK_MODELS) {
    if (!chain.includes(candidate)) chain.push(candidate);
  }
  return chain;
}

/**
 * Whether a model accepts `output_config.effort`. Haiku 4.5 rejects it with a
 * 400, so the request must leave it out there.
 */
export function supportsEffort(model: string): boolean {
  return !/haiku/i.test(model);
}

/**
 * Whether a value is shaped like an Anthropic API key.
 *
 * The key lives in ss4_settings, which still holds the previous provider's key
 * on a deployment that predates the switch. Sending that to Anthropic can only
 * produce a 401, so a stored value without this prefix is treated as "no key"
 * and the administrator is asked for a new one rather than shown "Installed".
 */
export function isAnthropicApiKey(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().startsWith('sk-ant-');
}

/** The HTTP status carried by an SDK error, if it has one. */
export function errorStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : undefined;
}

/**
 * Whether the error says "this particular model is unavailable" rather than
 * "the request failed". Those are worth answering by switching models
 * immediately; a generic rate-limit is better answered by waiting.
 */
export function isModelUnavailable(error: unknown): boolean {
  const status = errorStatus(error);
  if (status === 503 || status === 529) return true;

  const message = error instanceof Error ? error.message : String(error);
  return /\b503\b|\b529\b|model is (temporarily )?(down|unavailable)|no (available )?(provider|endpoint)|overloaded|capacity/i.test(
    message
  );
}
