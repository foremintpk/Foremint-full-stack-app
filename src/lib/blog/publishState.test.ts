/**
 * Blog publishing state-machine + timezone tests.
 *
 * Run with:  npm run test
 * Uses Node's built-in test runner (node:test) via tsx — no extra dependencies.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolvePublishTimestamps,
  validatePublishState,
  getEffectivePublishState,
  needsPublishRepair,
} from './publishState';
import { localInputToIso, isoToLocalInput, formatInTimeZone } from '../datetime';

const NOW = new Date('2026-08-23T10:44:00.000Z');
const FUTURE = '2026-08-23T15:00:00.000Z';
const PAST = '2026-06-20T14:00:00.000Z';

// ── Test 1 — Publish now ──────────────────────────────────────────────────────

test('Test 1: published with empty publish date → published_at = now', () => {
  const r = resolvePublishTimestamps({
    status: 'published', publishDate: null, existingPublishedAt: null, now: NOW,
  });
  assert.equal(r.publishedAt, NOW.toISOString());
  assert.equal(r.publishDate, null);
  assert.equal(r.isPublishing, true);
});

// ── Test 2 — Scheduled ────────────────────────────────────────────────────────

test('Test 2: scheduled keeps publish_date as UTC instant, published_at stays null', () => {
  const r = resolvePublishTimestamps({
    status: 'scheduled', publishDate: FUTURE, existingPublishedAt: null, now: NOW,
  });
  assert.equal(r.publishDate, FUTURE);
  assert.equal(r.publishedAt, null);
  assert.equal(r.isPublishing, false);
});

test('Test 2b: browser-local scheduled entry converts to the correct UTC instant', () => {
  // 8:00 PM in Karachi (UTC+5) is 15:00 UTC — the exact case from the bug.
  assert.equal(localInputToIso('2026-08-23T20:00', 'Asia/Karachi'), '2026-08-23T15:00:00.000Z');
  // Same wall-clock reading means a different instant elsewhere.
  assert.equal(localInputToIso('2026-08-23T20:00', 'UTC'), '2026-08-23T20:00:00.000Z');
  // DST-sensitive zone: New York is UTC-4 in August, not a fixed -5.
  assert.equal(localInputToIso('2026-08-23T20:00', 'America/New_York'), '2026-08-24T00:00:00.000Z');
  // ...and UTC-5 in January, proving the offset is not hardcoded.
  assert.equal(localInputToIso('2026-01-15T20:00', 'America/New_York'), '2026-01-16T01:00:00.000Z');
});

test('Test 2c: round-trip local → ISO → local is stable', () => {
  for (const tz of ['Asia/Karachi', 'America/New_York', 'Europe/London', 'UTC']) {
    const iso = localInputToIso('2026-08-23T20:00', tz);
    assert.equal(isoToLocalInput(iso, tz), '2026-08-23T20:00', `round-trip failed for ${tz}`);
  }
});

// ── Test 3 — Scheduled date in the past ───────────────────────────────────────

test('Test 3: scheduled with a past date is rejected', () => {
  const err = validatePublishState({ status: 'scheduled', publishDate: PAST, now: NOW });
  assert.match(err ?? '', /must be in the future/);
});

test('Test 3b: scheduled with no date is rejected', () => {
  const err = validatePublishState({ status: 'scheduled', publishDate: null, now: NOW });
  assert.match(err ?? '', /publish date is required/);
});

// ── Test 4 — Published with a future date ─────────────────────────────────────

test('Test 4: published + future date is rejected, never silently scheduled', () => {
  const err = validatePublishState({ status: 'published', publishDate: FUTURE, now: NOW });
  assert.match(err ?? '', /cannot have a future publication time/);
});

test('Test 4b: published + past/blank date passes validation', () => {
  assert.equal(validatePublishState({ status: 'published', publishDate: null, now: NOW }), null);
  assert.equal(validatePublishState({ status: 'published', publishDate: PAST, now: NOW }), null);
});

test('Test 4c: invalid date strings are rejected', () => {
  const err = validatePublishState({ status: 'published', publishDate: 'not-a-date', now: NOW });
  assert.match(err ?? '', /Invalid publish date/);
});

// ── Test 5 — Editing a published article ──────────────────────────────────────

test('Test 5: editing a published post preserves published_at', () => {
  const r = resolvePublishTimestamps({
    status: 'published', publishDate: null, existingPublishedAt: PAST, now: NOW,
  });
  assert.equal(r.publishedAt, PAST, 'publication history must not drift on a normal save');
  assert.equal(r.isPublishing, false);
});

// ── Test 6 — Clearing publish date on an existing published article ───────────

test('Test 6: clearing the publish date does not erase published_at', () => {
  const r = resolvePublishTimestamps({
    status: 'published', publishDate: null, existingPublishedAt: PAST, now: NOW,
  });
  assert.equal(r.publishedAt, PAST);
  assert.notEqual(r.publishedAt, null);
});

test('Test 6b: explicit republish rewrites published_at to server now', () => {
  const r = resolvePublishTimestamps({
    status: 'published', publishDate: null, existingPublishedAt: FUTURE, republish: true, now: NOW,
  });
  assert.equal(r.publishedAt, NOW.toISOString());
  assert.equal(r.isPublishing, true);
});

test('Test 6c: draft/archived never fabricate or erase published_at', () => {
  const draft = resolvePublishTimestamps({
    status: 'draft', publishDate: null, existingPublishedAt: PAST, now: NOW,
  });
  assert.equal(draft.publishedAt, PAST);

  const fresh = resolvePublishTimestamps({
    status: 'draft', publishDate: null, existingPublishedAt: null, now: NOW,
  });
  assert.equal(fresh.publishedAt, null);
});

// ── Test 7 — Browser timezone display ─────────────────────────────────────────

test('Test 7: one instant renders as the right local time per zone', () => {
  const instant = '2026-08-23T15:00:00.000Z';
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
  assert.equal(formatInTimeZone(instant, 'Asia/Karachi', opts), '20:00');
  assert.equal(formatInTimeZone(instant, 'UTC', opts), '15:00');
  assert.equal(formatInTimeZone(instant, 'America/New_York', opts), '11:00');
});

test('Test 7b: absent or invalid values format to empty string', () => {
  assert.equal(formatInTimeZone(null, 'UTC'), '');
  assert.equal(formatInTimeZone('garbage', 'UTC'), '');
  assert.equal(localInputToIso('', 'UTC'), null);
  assert.equal(localInputToIso(null, 'UTC'), null);
  assert.equal(isoToLocalInput(null, 'UTC'), '');
});

// ── Test 8 — Day boundary ─────────────────────────────────────────────────────

test('Test 8: times near midnight cross the UTC calendar day correctly', () => {
  // 23:30 in Karachi is 18:30 the same UTC day.
  assert.equal(localInputToIso('2026-08-23T23:30', 'Asia/Karachi'), '2026-08-23T18:30:00.000Z');
  // 00:30 in Karachi is 19:30 the *previous* UTC day.
  assert.equal(localInputToIso('2026-08-24T00:30', 'Asia/Karachi'), '2026-08-23T19:30:00.000Z');
  // 23:30 in New York (UTC-4 in Aug) rolls forward into the next UTC day.
  assert.equal(localInputToIso('2026-08-23T23:30', 'America/New_York'), '2026-08-24T03:30:00.000Z');
  // Round-trips hold across the boundary.
  assert.equal(isoToLocalInput('2026-08-23T19:30:00.000Z', 'Asia/Karachi'), '2026-08-24T00:30');
});

// ── Test 9 — Effective state / public API protection ──────────────────────────

test('Test 9: a future-dated published row is flagged, not treated as live', () => {
  const bad = { status: 'published' as const, publishedAt: FUTURE };
  assert.equal(getEffectivePublishState(bad, NOW), 'published_not_live');
  assert.equal(needsPublishRepair(bad, NOW), true);
});

test('Test 9b: a past-dated published row is live', () => {
  const good = { status: 'published' as const, publishedAt: PAST };
  assert.equal(getEffectivePublishState(good, NOW), 'published');
  assert.equal(needsPublishRepair(good, NOW), false);
});

test('Test 9c: published with a null published_at is flagged for repair', () => {
  const orphan = { status: 'published' as const, publishedAt: null };
  assert.equal(getEffectivePublishState(orphan, NOW), 'published_not_live');
});

test('Test 9d: non-published statuses pass through unchanged', () => {
  assert.equal(getEffectivePublishState({ status: 'draft', publishedAt: null }, NOW), 'draft');
  assert.equal(getEffectivePublishState({ status: 'scheduled', publishDate: FUTURE }, NOW), 'scheduled');
  assert.equal(getEffectivePublishState({ status: 'archived', publishedAt: PAST }, NOW), 'archived');
});

// ── Test 10 — Scheduled cron promotion ────────────────────────────────────────

test('Test 10: a promoted scheduled post lands in a live state', () => {
  // The cron sets status=published and published_at=publish_date once due.
  const dueAt = '2026-08-23T10:00:00.000Z'; // already passed relative to NOW
  const promoted = { status: 'published' as const, publishedAt: dueAt };
  assert.equal(getEffectivePublishState(promoted, NOW), 'published');
  assert.equal(needsPublishRepair(promoted, NOW), false);
});

test('Test 10b: a scheduled post is not live before its time', () => {
  const pending = { status: 'scheduled' as const, publishDate: FUTURE, publishedAt: null };
  assert.equal(getEffectivePublishState(pending, NOW), 'scheduled');
  // The public API filters on status anyway, but published_at must stay null.
  const r = resolvePublishTimestamps({
    status: 'scheduled', publishDate: FUTURE, existingPublishedAt: null, now: NOW,
  });
  assert.equal(r.publishedAt, null);
});
