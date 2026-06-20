-- Blog Multi-Category (2026-06-20)
-- Allows a post to belong to MANY categories via a junction table.
-- blog_posts.category_id is retained as the "primary" category (first selected)
-- for backward compatibility (API categoryName/slug/color + structured data).

CREATE TABLE IF NOT EXISTS public.blog_post_categories (
  post_id     uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

CREATE INDEX IF NOT EXISTS blog_post_categories_category_idx ON public.blog_post_categories(category_id);
CREATE INDEX IF NOT EXISTS blog_post_categories_post_idx     ON public.blog_post_categories(post_id);

-- Backfill from the existing single-category column.
INSERT INTO public.blog_post_categories (post_id, category_id)
SELECT id, category_id FROM public.blog_posts WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- RLS: admins/managers manage; public API reads via service role (bypasses RLS).
ALTER TABLE public.blog_post_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage blog post categories"
    ON public.blog_post_categories FOR ALL
    USING (public.get_my_role() IN ('administrator', 'manager'))
    WITH CHECK (public.get_my_role() IN ('administrator', 'manager'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
