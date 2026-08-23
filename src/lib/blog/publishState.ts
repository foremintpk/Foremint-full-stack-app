/**
 * Blog publishing state machine.
 *
 * Field semantics — these two columns are NOT interchangeable:
 *   publish_date  = the *requested* / scheduled publication time
 *   published_at  = the *actual* timestamp the post became publicly published
 *
 * Valid states:
 *   draft      → published_at = null                        (not public)
 *   scheduled  → publish_date > now, published_at = null     (not public, cron promotes it)
 *   published  → published_at <= now                         (public)
 *
 * Invalid state, which must never be produced through the admin UI:
 *   published  → published_at > now   (post is "published" yet the public API,
 *                                      which filters `.lte(published_at, now)`,
 *                                      correctly hides it → "Article not found")
 *
 * This module is pure so it can be unit-tested without a database.
 */

import type { BlogStatus } from '@/types/admin';

export type EffectivePublishState = 'draft' | 'scheduled' | 'published' | 'archived' | 'published_not_live';

/**
 * Derive what a row *actually* is, as opposed to what its status column claims.
 *
 * A row marked `published` whose published_at is still in the future is not
 * live; the dashboard must surface that rather than showing a normal green
 * "Published" badge.
 */
export function getEffectivePublishState(row: {
  status: BlogStatus;
  publishedAt?: string | null;
  publishDate?: string | null;
}, now: Date = new Date()): EffectivePublishState {
  if (row.status !== 'published') return row.status;

  const at = row.publishedAt ? new Date(row.publishedAt).getTime() : NaN;
  if (Number.isNaN(at)) return 'published_not_live';

  return at > now.getTime() ? 'published_not_live' : 'published';
}

/** True when a row is in the invalid published-but-future state and needs repair. */
export function needsPublishRepair(row: {
  status: BlogStatus;
  publishedAt?: string | null;
}, now: Date = new Date()): boolean {
  return getEffectivePublishState(row, now) === 'published_not_live';
}

export interface ResolvePublishInput {
  /** Status the admin selected on this save. */
  status: BlogStatus;
  /** Absolute ISO instant from the form's publish-date field, or null when blank. */
  publishDate: string | null;
  /** Existing published_at for an edit; null for a new post. */
  existingPublishedAt?: string | null;
  /**
   * True only when the admin performed an explicit publication-correction
   * action ("Publish Now"). Normal saves must never rewrite publication history.
   */
  republish?: boolean;
  /** Server-authoritative clock. Never the browser's. */
  now: Date;
}

export interface ResolvePublishResult {
  publishedAt: string | null;
  publishDate: string | null;
  /** True when this save transitions the post into a live published state. */
  isPublishing: boolean;
}

/**
 * Decide the publish_date / published_at pair for a save.
 *
 * Rules enforced here:
 *  - Published + no existing published_at   → publish immediately at server now.
 *  - Published + existing published_at      → preserve it (publication history),
 *                                             unless `republish` was requested.
 *  - Published + explicit republish         → published_at = server now (repair).
 *  - Scheduled                              → publish_date kept, published_at cleared.
 *  - Draft / archived                       → published_at preserved, not invented.
 *
 * A blank publish-date field never erases an existing published_at.
 */
export function resolvePublishTimestamps(input: ResolvePublishInput): ResolvePublishResult {
  const { status, publishDate, existingPublishedAt = null, republish = false, now } = input;
  const nowIso = now.toISOString();

  if (status === 'published') {
    // Explicit correction, or a first-time publish: stamp the server clock.
    // Otherwise keep the historical timestamp untouched.
    const publishedAt = republish || !existingPublishedAt ? nowIso : existingPublishedAt;
    return {
      publishedAt,
      // An immediate publication has no outstanding scheduling request.
      publishDate: null,
      isPublishing: republish || !existingPublishedAt,
    };
  }

  if (status === 'scheduled') {
    // Not yet public — the cron owns the promotion and will set published_at.
    return { publishedAt: null, publishDate, isPublishing: false };
  }

  // draft / archived: never fabricate a publication timestamp, never erase one.
  return { publishedAt: existingPublishedAt, publishDate, isPublishing: false };
}

/**
 * Validate a save against the state machine.
 * Returns an error message, or null when the input is valid.
 */
export function validatePublishState(input: {
  status: BlogStatus;
  publishDate: string | null;
  now: Date;
}): string | null {
  const { status, publishDate, now } = input;

  if (publishDate && Number.isNaN(new Date(publishDate).getTime())) {
    return 'Invalid publish date';
  }

  if (status === 'scheduled') {
    if (!publishDate) return 'A publish date is required for scheduled posts';
    if (new Date(publishDate).getTime() <= now.getTime()) {
      return 'Scheduled publish date must be in the future';
    }
  }

  // Never silently convert a future date into a schedule — tell the admin, so
  // they cannot accidentally create a post that is "published" yet invisible.
  if (status === 'published' && publishDate && new Date(publishDate).getTime() > now.getTime()) {
    return 'A published post cannot have a future publication time. Choose Scheduled to publish it later.';
  }

  return null;
}
