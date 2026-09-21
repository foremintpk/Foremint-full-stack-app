/**
 * @file src/lib/services/ss4/visionFallback.test.ts
 * @description Tests for the vision model fallback chain.
 *
 * The behaviour under test is the one that broke in production: the gateway
 * returned 503 "this model is temporarily unavailable" for claude-opus-5, and
 * because the retry loop only ever re-tried the same model, every attempt
 * failed and the document read failed outright.
 *
 * buildModelChain and isModelUnavailable are pure, so they are tested directly
 * rather than through a mocked HTTP client.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildModelChain, isModelUnavailable } from './visionModels';

describe('buildModelChain', () => {
  it('puts Opus first and Sonnet second by default', () => {
    const chain = buildModelChain('claude-opus-5');
    assert.equal(chain[0], 'claude-opus-5');
    assert.equal(chain[1], 'claude-sonnet-5');
  });

  it('does not repeat the configured model later in the chain', () => {
    const chain = buildModelChain('claude-opus-5');
    assert.equal(new Set(chain).size, chain.length);
  });

  it('honours an administrator choosing a non-default model', () => {
    const chain = buildModelChain('claude-sonnet-5');
    assert.equal(chain[0], 'claude-sonnet-5');
    // Opus is still available as a fallback, just not first.
    assert.ok(chain.includes('claude-opus-5'));
    assert.equal(new Set(chain).size, chain.length);
  });

  it('keeps an unknown configured model first and appends the known ones', () => {
    const chain = buildModelChain('some-custom-model');
    assert.equal(chain[0], 'some-custom-model');
    assert.ok(chain.includes('claude-opus-5'));
    assert.ok(chain.includes('claude-sonnet-5'));
  });

  it('always offers at least one alternative', () => {
    assert.ok(buildModelChain('claude-opus-5').length >= 2);
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

  it('does not treat auth or quota failures as a model outage', () => {
    // Switching models would not help here, so these must not trigger it.
    assert.equal(isModelUnavailable(new Error('401 authentication_error')), false);
    assert.equal(isModelUnavailable(new Error('quota exceeded')), false);
  });

  it('does not treat a plain rate limit as a model outage', () => {
    // 429 means wait, not switch.
    assert.equal(isModelUnavailable(new Error('429 rate limit exceeded')), false);
  });

  it('handles non-Error values without throwing', () => {
    assert.equal(isModelUnavailable('status_code=503'), true);
    assert.equal(isModelUnavailable(null), false);
  });
});
