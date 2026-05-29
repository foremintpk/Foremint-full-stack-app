-- 1. Addon Categories
CREATE TABLE IF NOT EXISTS public.addon_categories (
  id         uuid  NOT NULL DEFAULT gen_random_uuid(),
  name       text  NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT addon_categories_pkey PRIMARY KEY (id)
);

ALTER TABLE public.addon_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admin full access addon_categories"
    ON public.addon_categories FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('administrator', 'manager')
        AND is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Addons
CREATE TABLE IF NOT EXISTS public.addons (
  id          uuid    NOT NULL DEFAULT gen_random_uuid(),
  name        text    NOT NULL,
  price       numeric NOT NULL DEFAULT 0,
  features    text[]  NOT NULL DEFAULT '{}',
  status      text    NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'published')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT addons_pkey PRIMARY KEY (id)
);

ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admin full access addons"
    ON public.addons FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('administrator', 'manager')
        AND is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Addon ↔ Category join table (multi-select support)
CREATE TABLE IF NOT EXISTS public.addon_category_map (
  addon_id    uuid NOT NULL REFERENCES public.addons(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.addon_categories(id) ON DELETE CASCADE,
  CONSTRAINT addon_category_map_pkey PRIMARY KEY (addon_id, category_id)
);

ALTER TABLE public.addon_category_map ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admin full access addon_category_map"
    ON public.addon_category_map FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('administrator', 'manager')
        AND is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auto-update updated_at on addons
CREATE OR REPLACE FUNCTION update_addons_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER addons_updated_at
    BEFORE UPDATE ON public.addons
    FOR EACH ROW EXECUTE FUNCTION update_addons_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
