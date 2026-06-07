/**
 * @file src/lib/dashboard/billing-utils.ts
 * @description Single source of truth for customer-facing payment state.
 *
 * Mirrors the admin's syncOrderPaymentStatus() exactly so the customer dashboard,
 * the LLC list cards, the billing page, and the order billing tab all show the
 * SAME pending amount and paid/unpaid status — derived from grand_total + billing entries.
 */

export type BillingEntryLike = {
  amount: number;
  type: 'charge' | 'discount' | 'payment';
};

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface BillingState {
  charges: number;
  discounts: number;
  payments: number;
  /** grandTotal + charges − discounts */
  effective: number;
  /** max(0, effective − payments) */
  pending: number;
  status: PaymentStatus;
  isPaid: boolean;
}

/**
 * Compute the canonical billing state for an order.
 *
 * @param grandTotal  order.grand_total (coupon already baked in)
 * @param entries     billing_entries for the order
 */
export function computeBillingState(
  grandTotal: number,
  entries: BillingEntryLike[] = []
): BillingState {
  let charges = 0, discounts = 0, payments = 0;
  for (const e of entries) {
    const a = Number(e.amount) || 0;
    if (e.type === 'charge') charges += a;
    else if (e.type === 'discount') discounts += a;
    else if (e.type === 'payment') payments += a;
  }
  const effective = Number(grandTotal || 0) + charges - discounts;
  const pending = Math.max(0, effective - payments);
  const status: PaymentStatus = pending <= 0 ? 'paid' : payments > 0 ? 'partial' : 'unpaid';
  return { charges, discounts, payments, effective, pending, status, isPaid: pending <= 0 };
}
