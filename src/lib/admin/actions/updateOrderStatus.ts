/**
 * @file src/lib/admin/actions/updateOrderStatus.ts
 * @description Server Action to update the status of an order and record history.
 * 
 * FIX 1: Calls rpc('get_my_role') to check admin user role, avoiding direct recursive profiles query.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateTag, revalidatePath } from 'next/cache';
import {
  sendStateRegisteredEmail,
  sendFormationCompleteEmail,
} from '@/lib/email/sendOrderStatusEmails';

/**
 * Emails the customer when an order reaches a milestone worth announcing.
 *
 * Two transitions notify the customer:
 *   • `ein_pending`     — registered in state, federal filing under way
 *   • `payment_pending` — EIN received and formation complete, balance due
 *
 * `formed` is deliberately silent. The formation-complete announcement now
 * rides on `payment_pending` instead, so the customer hears "your EIN arrived"
 * and "here is what is left to pay" as one message rather than two.
 *
 * The payment-reminder template is not used here at all; it belongs to the bulk
 * send on the LLC Registrations list, which is for chasing customers who have
 * already been told and have not yet paid.
 *
 * Never throws: the status change has already been committed, so a mail
 * failure is logged for an operator rather than surfaced as a failed update.
 */
async function notifyCustomerOfStatusChange(
  orderId: string,
  newStatus: string,
  orderRow: Record<string, unknown>,
  adminSdk: ReturnType<typeof createAdminClient>
): Promise<void> {
  if (newStatus !== 'ein_pending' && newStatus !== 'payment_pending') return;

  try {
    const userId = orderRow.user_id as string | null;
    if (!userId) {
      console.warn('[updateOrderStatus] no user_id on order; skipping email', { orderId });
      return;
    }

    const { data: profile } = await adminSdk
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    const recipient = (profile as Record<string, unknown> | null)?.email as string | undefined;
    if (!recipient) {
      console.warn('[updateOrderStatus] no email for customer; skipping email', { orderId });
      return;
    }

    const snapshot =
      orderRow.form_snapshot && typeof orderRow.form_snapshot === 'object'
        ? (orderRow.form_snapshot as Record<string, unknown>)
        : {};

    const businessName =
      typeof snapshot.businessName === 'string' ? snapshot.businessName : '';

    const common = {
      to: recipient,
      userName: ((profile as Record<string, unknown>)?.full_name as string) ?? '',
      orderNumber: (orderRow.order_number as string) ?? orderId.slice(0, 8),
      businessName,
      formationState: (orderRow.formation_state_name as string) ?? '',
    };

    // Paid orders owe nothing; otherwise fall back to the grand total when no
    // explicit pending amount has been recorded.
    const pendingAmount =
      orderRow.payment_status === 'paid'
        ? 0
        : Number(orderRow.pending_amount_usd ?? orderRow.grand_total ?? 0);

    const result =
      newStatus === 'ein_pending'
        ? await sendStateRegisteredEmail(common)
        // payment_pending carries the formation-complete announcement: the EIN
        // has arrived, the work is done, and this is what remains to pay.
        : await sendFormationCompleteEmail({ ...common, pendingAmount });

    if (!result.ok && !result.skipped) {
      console.error('[updateOrderStatus] status email failed', {
        orderId,
        newStatus,
        error: result.error,
      });
    }
  } catch (err) {
    console.error('[updateOrderStatus] status email threw', {
      orderId,
      newStatus,
      error: err instanceof Error ? err.message : 'unknown error',
    });
  }
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: string,
  adminId: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // FIX 1: Retrieve user role via RPC call to prevent infinite RLS recursion
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager' && role !== 'account_manager')) {
      return { success: false, error: 'Unauthorized: Admin role required' };
    }

    const adminSdk = createAdminClient();

    // 1. Fetch current order status to record the history change.
    // The customer/company fields come along so a status-change email can be
    // composed without a second round trip.
    const { data: order, error: orderError } = await adminSdk
      .from('orders')
      .select(
        'status, order_number, user_id, form_snapshot, payment_status, pending_amount_usd, grand_total, formation_state_name'
      )
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    const orderRow = order as Record<string, unknown>;
    const oldStatus = orderRow.status as string;

    // 2. Perform the order status update
    const { error: updateError } = await adminSdk
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 3. Insert history audit log row
    const { error: historyError } = await adminSdk
      .from('order_status_history')
      .insert({
        order_id: orderId,
        changed_by: adminId,
        old_status: oldStatus,
        new_status: newStatus,
        note: note || `Status updated to ${newStatus} by admin.`,
        changed_at: new Date().toISOString(),
      });

    if (historyError) {
      console.error('[updateOrderStatus History Error]:', historyError);
    }

    // 4. Notify the customer when the order reaches a milestone they care about.
    // Only on an actual transition — re-saving the same status must not re-send.
    // Awaited so a failure is logged, but never fails the status change itself:
    // the status is already committed and is the source of truth.
    if (newStatus !== oldStatus) {
      await notifyCustomerOfStatusChange(orderId, newStatus, orderRow, adminSdk);
    }

    // 5. Invalidate relevant caches to trigger instant UI refresh
    revalidateTag(`order-${orderId}`, 'max');
    revalidateTag('order-list-llc', 'max');
    revalidateTag('order-list-llc-stats', 'max');
    revalidatePath('/admin/llc-registrations', 'layout');
    revalidatePath(`/admin/llc-registrations/${orderId}`, 'layout');

    // The customer sees this order too. Their dashboard caches are keyed by
    // user, so an admin-side status change left them showing the previous
    // status until their own cache expired.
    const customerId = orderRow.user_id as string | null;
    if (customerId) {
      revalidateTag(`customer-dashboard-${customerId}`, 'max');
      revalidateTag(`order-list-${customerId}`, 'max');
      revalidateTag(`llc-detail-${orderId}`, 'max');
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

