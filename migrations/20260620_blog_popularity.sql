-- Blog Popularity (2026-06-20)
-- Automatic, admin-free popularity: per-post view tracking that powers
-- "Most read" / "Popular" (all-time views) and "Trending" (recent-window views).
-- No admin UI or manual input — views are recorded by the public frontend.

-- Denormalized all-time counter for cheap "most read" ordering + display.
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS blog_posts_view_count_idx ON public.blog_posts(view_count DESC);

-- Timestamped view events — power the time-windowed "Trending" query.
CREATE TABLE IF NOT EXISTS public.blog_post_views (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  viewed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_post_views_post_idx       ON public.blog_post_views(post_id);
CREATE INDEX IF NOT EXISTS blog_post_views_viewed_at_idx  ON public.blog_post_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS blog_post_views_post_time_idx  ON public.blog_post_views(post_id, viewed_at DESC);

-- Only the service-role public API reads/writes this table.
ALTER TABLE public.blog_post_views ENABLE ROW LEVEL SECURITY;

-- ── Record a view (atomic) ────────────────────────────────────────────────────
-- No-op unless the slug resolves to a currently-published post.
CREATE OR REPLACE FUNCTION public.record_blog_view(p_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id
  FROM public.blog_posts
  WHERE slug = p_slug
    AND status = 'published'
    AND published_at IS NOT NULL
    AND published_at <= now();

  IF v_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.blog_post_views(post_id) VALUES (v_id);
  UPDATE public.blog_posts SET view_count = view_count + 1 WHERE id = v_id;
END;
$$;

-- ── Trending ids (most views within the last p_days days) ─────────────────────
CREATE OR REPLACE FUNCTION public.get_trending_blog_ids(p_days integer DEFAULT 7, p_limit integer DEFAULT 5)
RETURNS TABLE(post_id uuid, recent_views bigint)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT v.post_id, count(*) AS recent_views
  FROM public.blog_post_views v
  JOIN public.blog_posts b ON b.id = v.post_id
  WHERE v.viewed_at >= now() - make_interval(days => GREATEST(1, p_days))
    AND b.status = 'published'
    AND b.published_at <= now()
  GROUP BY v.post_id
  ORDER BY recent_views DESC, max(v.viewed_at) DESC
  LIMIT GREATEST(1, p_limit);
$$;

-- Keep these functions off the public PostgREST surface; the service-role API calls them.
REVOKE ALL ON FUNCTION public.record_blog_view(text)            FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_trending_blog_ids(integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_blog_view(text)            TO service_role;
GRANT EXECUTE ON FUNCTION public.get_trending_blog_ids(integer, integer) TO service_role;
