/**
 * @file src/lib/services/ss4/vision.ts
 * @description Claude vision client, used to read document layouts the local
 * text-layer parser cannot.
 *
 * The API key comes from the ss4_settings row rather than the environment, so
 * an administrator can rotate it from the EIN settings page without a redeploy.
 * ANTHROPIC_API_KEY is kept as a fallback so a deployment works before the key
 * has been entered in the UI.
 *
 * This talks to the Anthropic API directly. It previously went through an
 * OpenAI-compatible gateway; a key stored from that era is ignored (see
 * isAnthropicApiKey) rather than sent to a provider that can only reject it.
 */

import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { getSs4Settings } from './settings';
import {
  buildModelChain,
  configuredVisionModel,
  errorStatus,
  isAnthropicApiKey,
  isModelUnavailable,
  supportsEffort,
} from './visionModels';

export interface VisionImage {
  /** Base64 payload, no data: prefix. */
  data: string;
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp';
}

export interface VisionStatus {
  configured: boolean;
  model: string;
  /** 'settings' when the key came from the database, 'env' from the fallback. */
  source: 'settings' | 'env' | null;
}

/** Reading a multi-page scan is a one-shot call, but leave room for a slow one. */
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * Floor for max_tokens. Thinking tokens count against it even though the
 * thinking text is not returned, so the callers' small caps (256–512, sized for
 * a short JSON reply) would otherwise let the model spend them all thinking and
 * answer with nothing. It is a ceiling, not a target: the prompts ask for a
 * bare JSON object, so the reply stays short and the cost does not change.
 */
const MIN_OUTPUT_TOKENS = 4096;

/** The API rejects an image over 5 MB. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface VisionCredentials {
  apiKey: string | null;
  model: string;
  source: 'settings' | 'env' | null;
}

async function getCredentials(): Promise<VisionCredentials> {
  const model = configuredVisionModel();
  const settings = await getSs4Settings();

  if (isAnthropicApiKey(settings.visionApiKey)) {
    return { apiKey: settings.visionApiKey!.trim(), model, source: 'settings' };
  }

  const envKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (envKey) return { apiKey: envKey, model, source: 'env' };

  return { apiKey: null, model, source: null };
}

/** Whether a vision provider is available, for warning up front rather than per order. */
export async function visionStatus(): Promise<VisionStatus> {
  const { apiKey, model, source } = await getCredentials();
  return { configured: Boolean(apiKey), model, source };
}

export class VisionNotConfiguredError extends Error {
  constructor() {
    super(
      'No vision provider is configured. Add the Anthropic API key under Admin → EIN → Settings.'
    );
    this.name = 'VisionNotConfiguredError';
  }
}

/**
 * The model declined to read the document. A decline is an HTTP 200, not an
 * error, and a different model may well read it, so askVision treats this like
 * an unavailable model and moves down the chain.
 */
export class VisionRefusalError extends Error {
  constructor(model: string, category: string | null) {
    super(
      `${model} declined to read this document${category ? ` (${category})` : ''}.`
    );
    this.name = 'VisionRefusalError';
  }
}

/** Whether an error is temporary and worth retrying. */
function isTransient(error: unknown): boolean {
  // Covers timeouts too: APIConnectionTimeoutError extends APIConnectionError.
  if (error instanceof Anthropic.APIConnectionError) return true;

  const status = errorStatus(error);
  if (status !== undefined) {
    return status === 408 || status === 409 || status === 429 || status >= 500;
  }

  const message = error instanceof Error ? error.message : String(error);

  if (/authentication_error|invalid api key|401|403/i.test(message)) return false;
  if (/quota|daily limit|billing/i.test(message)) return false;

  return /\b(429|500|502|503|504)\b|high demand|overloaded|rate.?limit|ECONNRESET|ETIMEDOUT|fetch failed/i.test(
    message
  );
}

/** Rewrites generic API errors into something an administrator can act on. */
export function explainVisionError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const status = errorStatus(error);

  if (status === 401 || status === 403 || /authentication|invalid (x-)?api[- ]key/i.test(message)) {
    return 'The Anthropic API rejected the key. Check it under Admin → EIN → Settings.';
  }
  if (/credit balance|billing/i.test(message)) {
    return 'The Anthropic account is out of credit. Add credit in the Anthropic Console, then run again.';
  }
  if (status === 429 || /\b429\b|rate.?limit/i.test(message)) {
    return 'Rate-limited by the vision provider. Wait a moment and run again.';
  }
  if (/timeout|timed out|ETIMEDOUT/i.test(message)) {
    return 'The vision provider timed out reading this document. Try this order again on its own.';
  }
  if (isModelUnavailable(error)) {
    return 'Every available model is temporarily unavailable at the provider. This usually clears within a few minutes — run again shortly.';
  }
  return message;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fails fast on an image the API would reject, before any model is tried. */
function assertImagesWithinLimit(images: VisionImage[]): void {
  for (const image of images) {
    const bytes = Math.floor((image.data.length * 3) / 4);
    if (bytes > MAX_IMAGE_BYTES) {
      throw new Error(
        `A page image is ${(bytes / 1024 / 1024).toFixed(1)} MB, over the 5 MB the Claude API accepts. Upload a smaller copy of the document.`
      );
    }
  }
}

async function askClaude(
  system: string,
  prompt: string,
  images: VisionImage[],
  maxTokens: number,
  /** The model to use; askVision walks the fallback chain through this. */
  model: string
): Promise<{ text: string; model: string }> {
  const { apiKey } = await getCredentials();
  if (!apiKey) throw new VisionNotConfiguredError();

  const client = new Anthropic({
    apiKey,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 0, // retries are handled below, so backoff stays under our control
  });

  // Images first, then the instruction: the order the API recommends for vision.
  const content: Anthropic.ContentBlockParam[] = [
    ...images.map(
      (image): Anthropic.ImageBlockParam => ({
        type: 'image',
        source: { type: 'base64', media_type: image.mediaType, data: image.data },
      })
    ),
    { type: 'text', text: prompt },
  ];

  // No `temperature`: current models reject non-default sampling parameters.
  // Effort is `low` because this is perception plus a short JSON reply, not
  // reasoning. Haiku rejects the parameter outright, so it is left off there.
  const response = await client.messages.create({
    model,
    max_tokens: Math.max(maxTokens, MIN_OUTPUT_TOKENS),
    ...(system ? { system } : {}),
    ...(supportsEffort(model) ? { output_config: { effort: 'low' as const } } : {}),
    messages: [{ role: 'user', content }],
  });

  // Check before reading content: a decline arrives as a normal 200.
  if (response.stop_reason === 'refusal') {
    throw new VisionRefusalError(model, response.stop_details?.category ?? null);
  }

  // A response can open with thinking blocks, so pick the text out by type.
  const text = response.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('');

  if (!text && response.stop_reason === 'max_tokens') {
    throw new Error('The model ran out of output budget before it answered. Run this order again.');
  }

  return { text, model };
}

/**
 * Ask Claude, falling back across models when one is unavailable.
 *
 * Different failures are handled differently, because the right response to
 * each is different:
 *
 *   • The model is down (503/529) or declines the document. Retrying it is
 *     pointless for as long as that lasts, so we move to the next model in the
 *     chain immediately.
 *   • The request failed transiently (429, 500, socket reset). The model is
 *     fine, so we retry it with backoff before giving up on it.
 *
 * Anything else — a bad key, no credit, an oversized image — is not retried at
 * all, since no amount of waiting or model-switching will change the answer.
 */
export async function askVision(options: {
  system: string;
  prompt: string;
  images: VisionImage[];
  maxTokens?: number;
  attempts?: number;
}): Promise<{ text: string; provider: string }> {
  const maxTokens = options.maxTokens ?? 512;
  const attemptsPerModel = options.attempts ?? 3;

  assertImagesWithinLimit(options.images);

  const { model: configuredModel } = await getCredentials();
  const chain = buildModelChain(configuredModel);

  let lastError: unknown;

  for (const model of chain) {
    for (let attempt = 1; attempt <= attemptsPerModel; attempt++) {
      try {
        const { text } = await askClaude(
          options.system,
          options.prompt,
          options.images,
          maxTokens,
          model
        );
        if (model !== configuredModel) {
          console.warn(
            `[vision] ${configuredModel} unavailable; read completed on ${model}`
          );
        }
        return { text, provider: `anthropic/${model}` };
      } catch (error) {
        lastError = error;

        // This model is down or won't read the document. Further attempts
        // against it cannot succeed, so stop spending the retry budget here
        // and try the next one.
        if (isModelUnavailable(error) || error instanceof VisionRefusalError) {
          console.warn(`[vision] model ${model} unavailable, trying next`, {
            message: error instanceof Error ? error.message : String(error),
          });
          break;
        }

        // Permanent failure (auth, credit, input): switching models will not help.
        if (!isTransient(error)) return Promise.reject(error);

        if (attempt === attemptsPerModel) break;
        await sleep(attempt * 2000 - 1000);
      }
    }
  }

  console.error('[vision] every model in the chain failed', {
    chain,
    message: lastError instanceof Error ? lastError.message : String(lastError),
  });
  throw lastError;
}

/** Extracts the first JSON object from a reply, unwrapping a markdown fence. */
export function parseJsonReply<T>(raw: string): T | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).match(/\{[\s\S]*\}/);
  if (!candidate) return null;
  try {
    return JSON.parse(candidate[0]) as T;
  } catch {
    return null;
  }
}
