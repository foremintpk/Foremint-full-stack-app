-- Phase Z: Customer/B2B support ticket badge system
--
-- WHY last_customer_viewed_at is a separate column from last_customer_reply_at:
-- Using last_customer_reply_at for both "viewed" and "replied" would corrupt the
-- admin's get_attention_ticket_count() — that RPC checks
-- last_customer_reply_at > last_admin_reply_at to count tickets needing admin
-- attention. If we update last_customer_reply_at when customer merely views
-- (without replying), tickets would vanish from admin's attention list even
-- though customer hasn't responded.

ALTER TABLE queries
  ADD COLUMN IF NOT EXISTS last_customer_viewed_at TIMESTAMPTZ;

-- RPC: customer unread ticket badge count.
-- A ticket counts as unread when the admin has replied more recently than the
-- customer last viewed the thread (or the customer has never viewed it).
-- Mirrors get_attention_ticket_count() which serves the same purpose for admin.
CREATE OR REPLACE FUNCTION get_customer_unread_ticket_count(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM queries
  WHERE user_id = p_user_id
    AND status IN ('open', 'in_progress')
    AND last_admin_reply_at IS NOT NULL
    AND (
      last_customer_viewed_at IS NULL
      OR last_admin_reply_at > last_customer_viewed_at
    );
$$;
