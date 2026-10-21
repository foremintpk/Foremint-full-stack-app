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
import { sendOrderStatusEmail } from '@/lib/email/sendOrderStatusEmails';
import { hasStatusEmail } from '@/lib/email/orderStatusEmailContent';
import { readSnapshotBusinessName } from '@/lib/admin/formatters';
import {
  getStatusLabel,
  hasItinAddon,
  isItinStatus,
  isOrderStatus,
  isSelectableStatus,
} from '@/lib/orders/orderStatus';

/**
 * Emails the customer when an order moves to a status that has an email.
 *
 * Every status except Pending sends one (the table lives in
 * `orderStatusEmailContent.ts`). Pending is skipped because checkout already
 * sends the order confirmation. Callers invoke this only on a real transition,
 * so re-saving the same status never re-sends.
 *
 * `pending_payment` leads with the outstanding balance and a billing link;
 * `itin_payment_pending` shows it as well. The bulk payment-reminder template is
 * not used here; it belongs to the reminder send on the LLC Registrations list,
 * which chases customers who have already been told and have not yet paid.
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
  if (!hasStatusEmail(newStatus) || !isSelectableStatus(newStatus)) return;

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

    const businessName = readSnapshotBusinessName(orderRow.form_snapshot);

    // Paid orders owe nothing; otherwise fall back to the grand total when no
    // explicit pending amount has been recorded.
    const pendingAmount =
      orderRow.payment_status === 'paid'
        ? 0
        : Number(orderRow.pending_amount_usd ?? orderRow.grand_total ?? 0);

    const result = await sendOrderStatusEmail(newStatus, {
      to: recipient,
      userName: ((profile as Record<string, unknown>)?.full_name as string) ?? '',
      orderNumber: (orderRow.order_number as string) ?? orderId.slice(0, 8),
      businessName,
      formationState: (orderRow.formation_state_name as string) ?? '',
      pendingAmount,
    });

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
    // Reject anything that is not a known status before touching the database;
    // the value arrives from the client and would otherwise reach Postgres as an
    // invalid enum literal.
    if (!isOrderStatus(newStatus)) {
      return { success: false, error: 'Unknown order status' };
    }

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
        'status, order_number, user_id, form_snapshot, payment_status, pending_amount_usd, grand_total, formation_state_name, selected_addons, addons_snapshot'
      )
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    const orderRow = order as Record<string, unknown>;
    const oldStatus = orderRow.status as string;

    // ITIN statuses belong to orders that bought the ITIN add-on. The dropdown
    // already hides them otherwise; this stops a stale tab or a direct call from
    // putting an unrelated order on an ITIN stage (and emailing the customer
    // about an application they never made). An order already on an ITIN status
    // is left alone so it can always be moved off it.
    if (isItinStatus(newStatus) && newStatus !== oldStatus) {
      const { data: internalAddons } = await adminSdk
        .from('order_internal_addons')
        .select('addon_name')
        .eq('order_id', orderId)
        .is('removed_at', null);

      const itinOrder = hasItinAddon({
        selectedAddons: orderRow.selected_addons as unknown[] | null,
        addonsSnapshot: orderRow.addons_snapshot as Record<string, unknown>[] | null,
        internalAddons: (internalAddons ?? []) as Record<string, unknown>[],
      });

      if (!itinOrder) {
        return {
          success: false,
          error: `"${getStatusLabel(newStatus)}" is only available for orders with the ITIN add-on`,
        };
      }
    }

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
        note: note || `Status updated to ${getStatusLabel(newStatus)} by admin.`,
        changed_at: new Date().toISOString(),
      });

    if (historyError) {
      console.error('[updateOrderStatus History Error]:', historyError);
    }

    // 4. Notify the customer of the new status (see notifyCustomerOfStatusChange).
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

