-- Restrict a coupon to specific US formation states.
-- NULL or empty array = coupon is valid in every state (existing behaviour).
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS allowed_states TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.coupons.allowed_states IS
  'US state codes (e.g. {WY,DE}) the coupon is valid for. Empty array = all states.';

CREATE INDEX IF NOT EXISTS coupons_allowed_states_idx
  ON public.coupons USING GIN (allowed_states);
