/**
 * @file src/lib/services/ss4/visionFallback.test.ts
 * @description Tests for the vision model policy: the fallback chain, the model
 * override, key recognition and outage detection.
 *
 * The behaviour under test is the one that broke in production: the provider
 * returned 503 "this model is temporarily unavailable", and because the retry
 * loop only ever re-tried the same model, every attempt failed and the document
 * read failed outright.
 *
 * Everything here is pure, so it is tested directly rather than through a
 * mocked HTTP client.
 */

import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildModelChain,
  configuredVisionModel,
  DEFAULT_VISION_MODEL,
  isAnthropicApiKey,
  isModelUnavailable,
  supportsEffort,
} from './visionModels';

describe('buildModelChain', () => {
  it('puts Sonnet 5.5 first and Opus second by default', () => {
    const chain = buildModelChain(DEFAULT_VISION_MODEL);
    assert.equal(chain[0], 'claude-sonnet-5-5');
    assert.equal(chain[1], 'claude-opus-5-5');
  });

  it('does not repeat the configured model later in the chain', () => {
    const chain = buildModelChain(DEFAULT_VISION_MODEL);
    assert.equal(new Set(chain).size, chain.length);
  });

  it('honours an override that is not the default', () => {
    const chain = buildModelChain('claude-opus-5-5');
    assert.equal(chain[0], 'claude-opus-5-5');
    // Sonnet is still available as a fallback, just not first.
    assert.ok(chain.includes('claude-sonnet-5-5'));
    assert.equal(new Set(chain).size, chain.length);
  });

  it('keeps an unknown configured model first and appends the known ones', () => {
    const chain = buildModelChain('some-custom-model');
    assert.equal(chain[0], 'some-custom-model');
    assert.ok(chain.includes('claude-sonnet-5-5'));
    assert.ok(chain.includes('claude-opus-5-5'));
  });

  it('always offers at least one alternative', () => {
    assert.ok(buildModelChain(DEFAULT_VISION_MODEL).length >= 2);
  });
});

describe('configuredVisionModel', () => {
  const original = process.env.ANTHROPIC_MODEL;
  afterEach(() => {
    if (original === undefined) delete process.env.ANTHROPIC_MODEL;
    else process.env.ANTHROPIC_MODEL = original;
  });

  it('defaults to Sonnet 5.5', () => {
    delete process.env.ANTHROPIC_MODEL;
    assert.equal(configuredVisionModel(), 'claude-sonnet-5-5');
  });

  it('lets ANTHROPIC_MODEL override it, ignoring stray whitespace', () => {
    process.env.ANTHROPIC_MODEL = '  claude-opus-5-5 ';
    assert.equal(configuredVisionModel(), 'claude-opus-5-5');
  });

  it('treats a blank override as unset', () => {
    process.env.ANTHROPIC_MODEL = '   ';
    assert.equal(configuredVisionModel(), 'claude-sonnet-5-5');
  });
});

describe('supportsEffort', () => {
  it('is true for the Sonnet and Opus models', () => {
    assert.equal(supportsEffort('claude-sonnet-5-5'), true);
    assert.equal(supportsEffort('claude-opus-5-5'), true);
  });

  it('is false for Haiku, which rejects the parameter', () => {
    assert.equal(supportsEffort('claude-haiku-4-5'), false);
    assert.equal(supportsEffort('claude-haiku-4-5-20251001'), false);
  });
});

describe('isAnthropicApiKey', () => {
  it('accepts Anthropic key shapes', () => {
    assert.equal(isAnthropicApiKey('sk-ant-api03-abc'), true);
    assert.equal(isAnthropicApiKey('sk-ant-usr-abc'), true);
    assert.equal(isAnthropicApiKey('  sk-ant-api03-abc  '), true);
  });

  it('rejects a key left over from the previous provider', () => {
    assert.equal(isAnthropicApiKey('sk-fazita-123'), false);
    assert.equal(isAnthropicApiKey('sk-proj-123'), false);
  });

  it('rejects empty and missing values', () => {
    assert.equal(isAnthropicApiKey(''), false);
    assert.equal(isAnthropicApiKey(null), false);
    assert.equal(isAnthropicApiKey(undefined), false);
  });
});

describe('isModelUnavailable', () => {
  it('matches the production 503 that caused the outage', () => {
    assert.equal(
      isModelUnavailable(new Error('status_code=503, This model is temporarily down')),
      true
    );
  });

  it('matches overload and capacity wording', () => {
    assert.equal(isModelUnavailable(new Error('model is unavailable')), true);
    assert.equal(isModelUnavailable(new Error('Provider overloaded')), true);
    assert.equal(isModelUnavailable(new Error('no available provider')), true);
  });

  it("matches Anthropic's 529 overloaded response by status, whatever the message", () => {
    const error = Object.assign(new Error('upstream said something unhelpful'), { status: 529 });
    assert.equal(isModelUnavailable(error), true);
  });

  it('matches a 503 by status', () => {
    const error = Object.assign(new Error('Service Unavailable'), { status: 503 });
    assert.equal(isModelUnavailable(error), true);
  });

  it('does not treat auth or quota failures as a model outage', () => {
    // Switching models would not help here, so these must not trigger it.
    assert.equal(isModelUnavailable(new Error('401 authentication_error')), false);
    assert.equal(isModelUnavailable(new Error('quota exceeded')), false);
    const unauthorised = Object.assign(new Error('invalid x-api-key'), { status: 401 });
    assert.equal(isModelUnavailable(unauthorised), false);
  });

  it('does not treat a plain rate limit as a model outage', () => {
    // 429 means wait, not switch.
    assert.equal(isModelUnavailable(new Error('429 rate limit exceeded')), false);
    const limited = Object.assign(new Error('rate_limit_error'), { status: 429 });
    assert.equal(isModelUnavailable(limited), false);
  });

  it('handles non-Error values without throwing', () => {
    assert.equal(isModelUnavailable('status_code=503'), true);
    assert.equal(isModelUnavailable(null), false);
  });
});
