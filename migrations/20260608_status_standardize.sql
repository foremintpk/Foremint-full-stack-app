-- Migration: Standardize LLC order statuses to 5 canonical values
-- Old enum: pending, confirmed, in_progress, awaiting_documents, awaiting_payment, completed, cancelled, refunded
-- New enum: pending, initialized, submitted_in_state, ein_pending, formed, cancelled

-- Step 1: Rename old enum so we can create a new one with the same name
ALTER TYPE order_status RENAME TO order_status_old;

-- Step 2: Create new standardized enum
CREATE TYPE order_status AS ENUM (
  'pending',
  'initialized',
  'submitted_in_state',
  'ein_pending',
  'formed',
  'cancelled'
);

-- Step 3: Temporarily cast the orders status column to TEXT for value migration
ALTER TABLE orders ALTER COLUMN status TYPE TEXT;

-- Step 4: Map old values to new canonical values
UPDATE orders SET status = CASE status
  WHEN 'in_progress'          THEN 'initialized'
  WHEN 'awaiting_documents'   THEN 'initialized'
  WHEN 'awaiting_payment'     THEN 'initialized'
  WHEN 'confirmed'            THEN 'formed'
  WHEN 'completed'            THEN 'formed'
  WHEN 'refunded'             THEN 'formed'
  ELSE status  -- 'pending' and 'cancelled' keep their values
END
WHERE status IN (
  'in_progress', 'awaiting_documents', 'awaiting_payment',
  'confirmed', 'completed', 'refunded'
);

-- Step 5: Cast back to the new enum type
ALTER TABLE orders ALTER COLUMN status TYPE order_status USING status::order_status;

-- Step 6: Restore default value with new enum
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending'::order_status;

-- Step 7: Drop old enum
DROP TYPE order_status_old;

-- Note: order_status_history stores statuses as TEXT columns, so no migration needed there.
-- Historical records will retain old status string labels which is acceptable for audit trails.
