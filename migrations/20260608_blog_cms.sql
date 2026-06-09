-- Blog CMS Migration
-- Creates blog_posts, blog_categories, and blog_tags tables with RLS

-- ── Categories ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Tags ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.blog_tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  slug       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Blog Status Enum ─────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.blog_status AS ENUM ('draft', 'published', 'scheduled', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.blog_content_type AS ENUM ('informational', 'guide', 'comparison', 'transactional', 'cost_analysis');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Blog Posts ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core fields
  title                  text NOT NULL,
  slug                   text NOT NULL UNIQUE,
  excerpt                text NOT NULL,
  featured_image_url     text,
  featured_image_alt     text,
  author                 text NOT NULL,
  category_id            uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  status                 public.blog_status NOT NULL DEFAULT 'draft',
  publish_date           timestamptz,

  -- Rich content
  content                text NOT NULL DEFAULT '',

  -- SEO fields
  meta_title             text,
  meta_description       text,
  focus_keyword          text,
  secondary_keywords     text[],
  canonical_url          text,
  og_title               text,
  og_description         text,
  og_image               text,
  twitter_title          text,
  twitter_description    text,
  twitter_image          text,

  -- AEO fields
  answer_summary         text,
  primary_entity         text,
  related_entities       text[],
  content_type           public.blog_content_type,
  key_takeaways          text[],
  faqs                   jsonb DEFAULT '[]'::jsonb,

  -- Internal SEO
  related_article_ids    uuid[],
  related_service_pages  text[],

  -- Auto-generated (computed on save)
  reading_time_minutes   integer GENERATED ALWAYS AS (
    GREATEST(1, CEIL(array_length(string_to_array(content, ' '), 1)::numeric / 200))
  ) STORED,
  word_count             integer GENERATED ALWAYS AS (
    COALESCE(array_length(string_to_array(content, ' '), 1), 0)
  ) STORED,

  -- Structured data (auto-generated JSON-LD stored for API performance)
  structured_data        jsonb,

  -- Audit
  created_by             uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by             uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  published_at           timestamptz
);

-- ── Blog Post Tags (M2M) ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id    uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id     uuid NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS blog_posts_status_idx         ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS blog_posts_publish_date_idx   ON public.blog_posts(publish_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS blog_posts_category_id_idx    ON public.blog_posts(category_id);
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx           ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS blog_posts_created_at_idx     ON public.blog_posts(created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.blog_posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags  ENABLE ROW LEVEL SECURITY;

-- Admins and managers can do everything on blog posts
CREATE POLICY "Admins manage blog posts"
  ON public.blog_posts FOR ALL
  USING (get_my_role() IN ('administrator', 'manager'))
  WITH CHECK (get_my_role() IN ('administrator', 'manager'));

-- Public reads only published posts (used by anon service role API)
-- Note: public API endpoints use service role key and filter by status='published' in app code.

-- Admins manage categories
CREATE POLICY "Admins manage blog categories"
  ON public.blog_categories FOR ALL
  USING (get_my_role() IN ('administrator', 'manager'))
  WITH CHECK (get_my_role() IN ('administrator', 'manager'));

-- Admins manage tags
CREATE POLICY "Admins manage blog tags"
  ON public.blog_tags FOR ALL
  USING (get_my_role() IN ('administrator', 'manager'))
  WITH CHECK (get_my_role() IN ('administrator', 'manager'));

-- Admins manage post-tag relations
CREATE POLICY "Admins manage blog post tags"
  ON public.blog_post_tags FOR ALL
  USING (get_my_role() IN ('administrator', 'manager'))
  WITH CHECK (get_my_role() IN ('administrator', 'manager'));

-- ── Updated-at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER blog_categories_updated_at
  BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
