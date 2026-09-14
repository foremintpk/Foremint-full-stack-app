/**
 * @file src/lib/services/ss4/vision.ts
 * @description Fazita vision gateway client, used to read document layouts the
 * local text-layer parser cannot.
 *
 * Ported from ss4-app with one change: the API key comes from the ss4_settings
 * row rather than the environment, so an administrator can rotate it from the
 * EIN settings page without a redeploy. The env var is kept as a fallback so a
 * deployment works before the key has been entered in the UI.
 *
 * Fazita is an OpenAI-compatible gateway, which is why this uses the `openai`
 * SDK rather than the Anthropic one despite serving Claude models.
 */

import 'server-only';
import OpenAI from 'openai';
import { getSs4Settings } from './settings';

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

const API_BASE_URL = 'https://fazita.com/v1';
const DEFAULT_MODEL = 'claude-opus-5';

/** Reading a full-page scan through this gateway routinely takes 60–120s. */
const REQUEST_TIMEOUT_MS = 240_000;

interface VisionCredentials {
  apiKey: string | null;
  model: string;
  source: 'settings' | 'env' | null;
}

async function getCredentials(): Promise<VisionCredentials> {
  const settings = await getSs4Settings();

  if (settings.visionApiKey) {
    return {
      apiKey: settings.visionApiKey,
      model: settings.visionModel || DEFAULT_MODEL,
      source: 'settings',
    };
  }

  const envKey = process.env.FAZITA_API_KEY?.trim();
  if (envKey) {
    return {
      apiKey: envKey,
      model: process.env.FAZITA_MODEL || settings.visionModel || DEFAULT_MODEL,
      source: 'env',
    };
  }

  return { apiKey: null, model: settings.visionModel || DEFAULT_MODEL, source: null };
}

/** Whether a vision provider is available, for warning up front rather than per order. */
export async function visionStatus(): Promise<VisionStatus> {
  const { apiKey, model, source } = await getCredentials();
  return { configured: Boolean(apiKey), model, source };
}

export class VisionNotConfiguredError extends Error {
  constructor() {
    super(
      'No vision provider is configured. Add the Fazita API key under Admin → EIN → Settings.'
    );
    this.name = 'VisionNotConfiguredError';
  }
}

/** Whether an error is temporary and worth retrying. */
function isTransient(error: unknown): boolean {
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

  if (/401|403|authentication|invalid api key/i.test(message)) {
    return 'The Fazita API rejected the key. Check it under Admin → EIN → Settings.';
  }
  if (/\b429\b|rate.?limit/i.test(message)) {
    return 'Rate-limited by the vision provider. Wait a moment and run again.';
  }
  if (/timeout|ETIMEDOUT/i.test(message)) {
    return 'The vision provider timed out reading this document. Try this order again on its own.';
  }
  return message;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function askFazita(
  system: string,
  prompt: string,
  images: VisionImage[],
  maxTokens: number
): Promise<{ text: string; model: string }> {
  const { apiKey, model } = await getCredentials();
  if (!apiKey) throw new VisionNotConfiguredError();

  const client = new OpenAI({
    baseURL: API_BASE_URL,
    apiKey,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 0, // retries are handled below, so backoff stays under our control
  });

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = images.map((img) => ({
    type: 'image_url',
    image_url: { url: `data:${img.mediaType};base64,${img.data}` },
  }));
  content.push({ type: 'text', text: prompt });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content });

  // Neither `temperature` nor `response_format` is sent: claude-opus-5 rejects
  // temperature outright, and this gateway ignores response_format and returns
  // fenced markdown regardless — which parseJsonReply already unwraps.
  const completion = await client.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
  });

  return { text: completion.choices[0]?.message?.content || '', model };
}

export async function askVision(options: {
  system: string;
  prompt: string;
  images: VisionImage[];
  maxTokens?: number;
  attempts?: number;
}): Promise<{ text: string; provider: string }> {
  const maxTokens = options.maxTokens ?? 512;
  const attempts = options.attempts ?? 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const { text, model } = await askFazita(
        options.system,
        options.prompt,
        options.images,
        maxTokens
      );
      return { text, provider: `fazita/${model}` };
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isTransient(error)) break;
      await sleep(attempt * 2000 - 1000);
    }
  }

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
