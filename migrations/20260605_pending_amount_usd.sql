-- Adds pending_amount_usd column and backfills it from existing billing_entries.
-- Safe to re-run; ADD COLUMN IF NOT EXISTS is idempotent.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pending_amount_usd NUMERIC(10,2);

-- Backfill all orders: grand_total + charges - discounts - payments
UPDATE public.orders o
SET pending_amount_usd = GREATEST(0,
  o.grand_total
  + COALESCE((SELECT SUM(be.amount) FROM public.billing_entries be WHERE be.order_id = o.id AND be.type = 'charge'),   0)
  - COALESCE((SELECT SUM(be.amount) FROM public.billing_entries be WHERE be.order_id = o.id AND be.type = 'discount'), 0)
  - COALESCE((SELECT SUM(be.amount) FROM public.billing_entries be WHERE be.order_id = o.id AND be.type = 'payment'),  0)
);

-- Also fix payment_status for orders that already have billing entries
UPDATE public.orders o
SET payment_status = CASE
  WHEN GREATEST(0,
    o.grand_total
    + COALESCE((SELECT SUM(be.amount) FROM public.billing_entries be WHERE be.order_id = o.id AND be.type = 'charge'),   0)
    - COALESCE((SELECT SUM(be.amount) FROM public.billing_entries be WHERE be.order_id = o.id AND be.type = 'discount'), 0)
    - COALESCE((SELECT SUM(be.amount) FROM public.billing_entries be WHERE be.order_id = o.id AND be.type = 'payment'),  0)
  ) <= 0 THEN 'paid'
  WHEN COALESCE((SELECT SUM(be.amount) FROM public.billing_entries be WHERE be.order_id = o.id AND be.type = 'payment'), 0) > 0 THEN 'partial'
  ELSE 'unpaid'
END
WHERE EXISTS (SELECT 1 FROM public.billing_entries be WHERE be.order_id = o.id);

NOTIFY pgrst, 'reload schema';
