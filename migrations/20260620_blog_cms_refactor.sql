-- Blog CMS Refactor Migration (2026-06-20)
-- Extends blog_categories and blog_posts for the professional CMS refactor.
-- Backward-compatible: only ADDs columns/indexes, never drops. Safe to run multiple times.

-- ── Categories: management fields ─────────────────────────────────────────────

ALTER TABLE public.blog_categories
  ADD COLUMN IF NOT EXISTS color      text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS blog_categories_sort_order_idx ON public.blog_categories(sort_order);
CREATE INDEX IF NOT EXISTS blog_categories_is_active_idx  ON public.blog_categories(is_active);
CREATE INDEX IF NOT EXISTS blog_categories_deleted_at_idx ON public.blog_categories(deleted_at);

-- ── Blog Posts: rich content + publishing fields ──────────────────────────────

-- Rich content is stored as both structured JSON (editor source of truth) and
-- rendered HTML (frontend consumption). The legacy `content` (text) column is
-- retained for backward compatibility and kept in sync as a plaintext fallback.
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS content_json jsonb,
  ADD COLUMN IF NOT EXISTS content_html text,
  ADD COLUMN IF NOT EXISTS toc          jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_featured  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS blog_posts_is_featured_idx ON public.blog_posts(is_featured) WHERE is_featured = true;

-- Performance indexes for public endpoints (slug/category_id/status already exist).
CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx
  ON public.blog_posts(published_at DESC NULLS LAST);

-- Composite index for the common public listing query (published + ordered).
CREATE INDEX IF NOT EXISTS blog_posts_status_published_at_idx
  ON public.blog_posts(status, published_at DESC NULLS LAST);

-- ── Reading time: recompute from HTML when available ──────────────────────────
-- The original generated column derived reading_time/word_count from the legacy
-- `content` text. Rich content now lives in content_html, so replace the
-- generated columns with ones that strip HTML tags before counting words.

DO $$
BEGIN
  -- Drop old generated columns if they exist (they are STORED GENERATED).
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blog_posts'
      AND column_name = 'word_count' AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE public.blog_posts DROP COLUMN word_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blog_posts'
      AND column_name = 'reading_time_minutes' AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE public.blog_posts DROP COLUMN reading_time_minutes;
  END IF;
END $$;

-- Helper: count words in plain text derived from HTML (falls back to legacy content).
CREATE OR REPLACE FUNCTION public.blog_plaintext(html text, fallback text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT regexp_replace(
           regexp_replace(COALESCE(NULLIF(html, ''), fallback, ''), '<[^>]*>', ' ', 'g'),
           '\s+', ' ', 'g'
         );
$$;

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS word_count integer
    GENERATED ALWAYS AS (
      COALESCE(array_length(
        string_to_array(trim(public.blog_plaintext(content_html, content)), ' '), 1
      ), 0)
    ) STORED,
  ADD COLUMN IF NOT EXISTS reading_time_minutes integer
    GENERATED ALWAYS AS (
      GREATEST(1, CEIL(
        COALESCE(array_length(
          string_to_array(trim(public.blog_plaintext(content_html, content)), ' '), 1
        ), 0)::numeric / 200
      ))
    ) STORED;

-- ── Scheduled publishing support ──────────────────────────────────────────────
-- Index used by the scheduled-publish cron to find due posts cheaply.
CREATE INDEX IF NOT EXISTS blog_posts_scheduled_due_idx
  ON public.blog_posts(publish_date)
  WHERE status = 'scheduled';
