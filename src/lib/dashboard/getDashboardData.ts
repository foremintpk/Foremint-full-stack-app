import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatLlcName } from '../admin/formatters';
import { computeBillingState } from './billing-utils';
import { fetchCustomerNotifications } from './customerNotifications';
import type {
  CustomerDashboardData,
  CustomerLlcItem,
  CustomerActionRequired,
  CustomerNotification,
  CustomerInvoiceItem,
  CustomerDashboardStats,
  Profile,
} from '@/types/dashboard';

/**
 * Scope options for the dashboard query.
 * - Default (omitted): a customer's OWN orders (filtered by user_id).
 * - assignedOrderIds: B2B "read-only" mode — show only these explicitly assigned
 *   LLC orders (which belong to other customers). When set, actionable items
 *   (payments, renewals, resubmissions) are suppressed.
 */
interface DashboardScope {
  assignedOrderIds?: string[];
  readOnly?: boolean;
}

async function fetchDashboardDataQuery(
  supabase: any,
  userId: string,
  fullName: string,
  scope?: DashboardScope,
  prefetchedProfile?: Profile | null
): Promise<CustomerDashboardData> {
  const isB2B = !!scope?.readOnly;

  // adminSdk: companies/billing_entries have admin-only RLS. Ownership already enforced —
  // ids come from this customer's own orders, or (B2B) from explicit admin assignments.
  const adminSdk = createAdminClient();

  // ── Phase 1: independent fetches — none of these depend on each other's
  // results, so run them concurrently instead of one round trip at a time. ──

  const profilePromise: Promise<any> = prefetchedProfile
    ? Promise.resolve(prefetchedProfile)
    : supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .then((r: any) => r.data);

  const ordersPromise: Promise<any[]> = scope?.assignedOrderIds
    ? (async () => {
        // B2B mode: assigned orders belong to other users, so read via adminSdk.
        if (scope.assignedOrderIds!.length === 0) return [];
        const { data: ordersData, error: ordersError } = await adminSdk
          .from('orders')
          .select('*')
          .in('id', scope.assignedOrderIds!)
          .ilike('order_type', '%llc%')
          .order('created_at', { ascending: false });
        if (ordersError) console.error('[fetchDashboardDataQuery B2B ordersError]:', ordersError);
        return ordersData || [];
      })()
    : (async () => {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .ilike('order_type', '%llc%')
          .order('created_at', { ascending: false });
        if (ordersError) console.error('[fetchDashboardDataQuery ordersError]:', ordersError);
        return ordersData || [];
      })();

  const notificationsPromise = fetchCustomerNotifications(supabase, userId, isB2B);

  const manualInvoicesPromise: Promise<any[]> = (!isB2B && fullName)
    ? supabase
        .from('invoices')
        .select('*')
        .ilike('name', `%${fullName}%`)
        .order('date', { ascending: false })
        .then((r: any) => r.data || [])
    : Promise.resolve([]);

  const [profileRow, orders, notificationsData, manualInvoices] = await Promise.all([
    profilePromise,
    ordersPromise,
    notificationsPromise,
    manualInvoicesPromise,
  ]);

  if (!profileRow) {
    throw new Error('Profile not found');
  }

  const orderIdList = orders.map((o: any) => o.id);
  const companyIds = orders.map((o: any) => o.company_id).filter(Boolean);

  // ── Phase 2: fetches that depend on the resolved order set — independent of
  // each other, so they also run concurrently once `orders` is known. ──
  const [companiesRows, entriesRows, receiptDocRows, resubmitRows] = await Promise.all([
    companyIds.length > 0
      ? adminSdk
          .from('companies')
          .select('id, company_name, state_renewal_date, state_renewal_fees, formation_date, ein')
          .in('id', companyIds)
          .then((r: any) => r.data || [])
      : Promise.resolve([]),
    orderIdList.length > 0
      ? adminSdk
          .from('billing_entries')
          .select('order_id, amount, type')
          .in('order_id', orderIdList)
          .then((r: any) => r.data || [])
      : Promise.resolve([]),
    orderIdList.length > 0
      ? adminSdk
          .from('documents')
          .select('id, order_id')
          .in('order_id', orderIdList)
          .eq('slot_key', 'payment_receipt')
          .is('superseded_at', null)
          .then((r: any) => r.data || [])
      : Promise.resolve([]),
    (!isB2B && orderIdList.length > 0)
      ? supabase
          .from('document_resubmission_requests')
          .select('*')
          .in('order_id', orderIdList)
          .eq('status', 'pending')
          .then((r: any) => r.data || [])
      : Promise.resolve([]),
  ]);

  // Companies
  const companiesMap: Record<string, any> = {};
  companiesRows.forEach((c: any) => { companiesMap[c.id] = c; });

  // Billing entries (single source of truth for pending/paid) — grouped by order
  const billingByOrder: Record<string, { amount: number; type: 'charge' | 'discount' | 'payment' }[]> = {};
  entriesRows.forEach((e: any) => {
    (billingByOrder[e.order_id] ??= []).push({ amount: Number(e.amount || 0), type: e.type });
  });

  // Payment-receipt documents — map order_id → active receipt doc id (for proxied API link)
  const receiptDocByOrder: Record<string, string> = {};
  receiptDocRows.forEach((d: any) => { receiptDocByOrder[d.order_id] = d.id; });

  const llcs: CustomerLlcItem[] = [];
  orders.forEach((o: any) => {
    const companyId = o.company_id;
    const company = companyId ? companiesMap[companyId] : null;

    let complianceState: CustomerLlcItem['complianceState'] = 'unknown';
    if (o.status === 'formed') {
      complianceState = 'compliant';
      if (company?.state_renewal_date) {
        const renewalDate = new Date(company.state_renewal_date);
        const today = new Date();
        const diffTime = renewalDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          complianceState = 'renewal_due';
        }
      }
    }

    const formSnapshot = o.form_snapshot || {};
    const rawBusinessName = formSnapshot?.step3?.businessName ?? formSnapshot?.businessName ?? '';

    // Canonical billing state — same formula as admin + order billing tab
    const billing = computeBillingState(Number(o.grand_total || 0), billingByOrder[o.id] || []);

    llcs.push({
      id: o.id,
      companyId: companyId,
      llcName: formatLlcName(rawBusinessName || company?.company_name || `Order ${o.order_number}`),
      status: o.status,
      formationState: o.formation_state || formSnapshot?.step2?.state || null,
      formationStateName: o.formation_state_name || formSnapshot?.step2?.stateName || null,
      renewalDate: company?.state_renewal_date || null,
      formationDate: company?.formation_date || null,
      pendingAmount: billing.pending,
      paymentStatus: billing.status,
      complianceState,
    });
  });

  const pendingResubmissions: any[] = resubmitRows;

  const actions: CustomerActionRequired[] = [];

  pendingResubmissions.forEach((r) => {
    const linkedOrder = llcs.find((l) => l.id === r.order_id);
    const llcName = linkedOrder?.llcName || 'Your LLC';
    actions.push({
      id: r.id,
      type: 'document_resubmission',
      title: `Resubmit Document for ${llcName}`,
      description: r.note || `Admin requested a re-upload of the document for field "${r.field_name}".`,
      dueDate: null,
      priority: 'high',
      llcId: r.order_id,
      llcName,
      metadata: {
        fieldName: r.field_name,
        memberIndex: r.member_index,
        note: r.note,
      },
    });
  });

  // B2B customers have read-only access — no payment / renewal actions for them.
  if (!isB2B) llcs.forEach((llc) => {
    if (llc.paymentStatus !== 'paid') {
      const orderRecord = orders.find((o: any) => o.id === llc.id);
      actions.push({
        id: `pay-${llc.id}`,
        type: 'invoice_payment',
        title: `Complete Payment for ${llc.llcName}`,
        description: `Pending balance: $${llc.pendingAmount.toLocaleString()}. Please upload your bank transfer receipt.`,
        dueDate: null,
        priority: 'high',
        llcId: llc.id,
        llcName: llc.llcName,
        metadata: {
          amount: llc.pendingAmount,
          invoiceNumber: orderRecord?.order_number || '',
        },
      });
    }
  });

  if (!isB2B) llcs.forEach((llc) => {
    if (llc.complianceState === 'renewal_due') {
      const companyRecord = orders.find((o: any) => o.id === llc.id)?.companies;
      actions.push({
        id: `renewal-${llc.id}`,
        type: 'renewal_payment',
        title: `Renew Annual Filing for ${llc.llcName}`,
        description: `Your annual state renewal date is ${llc.renewalDate}. Filing fee: $${companyRecord?.state_renewal_fees || 0}.`,
        dueDate: llc.renewalDate,
        priority: 'medium',
        llcId: llc.id,
        llcName: llc.llcName,
        metadata: {
          amount: Number(companyRecord?.state_renewal_fees || 100),
          renewalDate: llc.renewalDate,
        },
      });
    }
  });

  const notifications: CustomerNotification[] = notificationsData;

  const invoices: CustomerInvoiceItem[] = [];

  orders.forEach((o: any) => {
    const formSnapshot = o.form_snapshot || {};
    const rawBusinessName = formSnapshot?.step3?.businessName ?? formSnapshot?.businessName ?? '';
    const nameLabel = formatLlcName(rawBusinessName || `LLC Formation Order ${o.order_number}`);

    // Canonical billing state
    const billing = computeBillingState(Number(o.grand_total || 0), billingByOrder[o.id] || []);
    // Proxy the receipt through our API — never expose the raw Cloudinary URL
    const receiptDocId = receiptDocByOrder[o.id];

    invoices.push({
      id: o.id,
      invoiceNumber: o.order_number || `ORD-${o.id.slice(0, 8).toUpperCase()}`,
      date: o.submitted_at || o.created_at,
      name: nameLabel,
      amount: billing.effective,
      paidAmount: billing.payments,
      pendingAmount: billing.pending,
      status: billing.status,
      type: 'order',
      notes: o.notes,
      downloadUrl: receiptDocId ? `/api/documents/${receiptDocId}/view` : null,
    });
  });

  manualInvoices.forEach((row: any) => {
    const manualAmount = Number(row.total_amount_pkr) || 0;
    invoices.push({
      id: row.id,
      invoiceNumber: row.invoice_number,
      date: row.date,
      name: row.name,
      amount: manualAmount,
      paidAmount: manualAmount,
      pendingAmount: 0,
      status: 'paid',
      type: 'manual',
      notes: row.notes,
    });
  });

  const totalLlcs = llcs.length;
  const activeLlcs = llcs.filter((l) => l.status === 'formed').length;
  const pendingActions = actions.filter((a) => a.priority === 'high').length;
  const pendingPayments = llcs.filter((l) => l.paymentStatus !== 'paid').length;

  const upcomingRenewals = llcs.filter((l) => {
    if (!l.renewalDate) return false;
    const renewalDate = new Date(l.renewalDate);
    const today = new Date();
    const diffTime = renewalDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 60;
  }).length;

  const stats: CustomerDashboardStats = {
    totalLlcs,
    activeLlcs,
    pendingActions,
    pendingPayments,
    upcomingRenewals,
  };

  return {
    stats,
    llcs,
    actions,
    notifications,
    invoices,
    profile: profileRow,
  };
}

export async function getDashboardData(
  userId: string,
  fullName: string,
  prefetchedProfile?: Profile | null
): Promise<CustomerDashboardData> {
  const supabase = await createClient();
  // Captured via closure (not passed into unstable_cache's args) so the cache
  // key is unchanged — it's only used to skip a redundant query on cache misses.
  return unstable_cache(
    async (id: string, name: string) => {
      return fetchDashboardDataQuery(supabase, id, name, undefined, prefetchedProfile);
    },
    [`customer-dashboard-${userId}`],
    {
      revalidate: 30,
      tags: [`customer-dashboard-${userId}`, `notif-list-${userId}`, `order-list-${userId}`],
    }
  )(userId, fullName);
}

export const getCachedDashboardData = cache(async (
  userId: string,
  fullName: string,
  prefetchedProfile?: Profile | null
) => {
  return getDashboardData(userId, fullName, prefetchedProfile);
});

// ── B2B (read-only) dashboard ────────────────────────────────────────────────

/** Returns the LLC order ids explicitly assigned to a B2B customer. */
export async function getB2BAssignedOrderIds(userId: string): Promise<string[]> {
  const adminSdk = createAdminClient();
  const { data, error } = await adminSdk
    .from('b2b_order_assignments')
    .select('order_id')
    .eq('b2b_user_id', userId);
  if (error) {
    console.error('[getB2BAssignedOrderIds] error:', error);
    return [];
  }
  return (data || []).map((r: any) => r.order_id);
}

/**
 * Dashboard data for a B2B customer — only their assigned LLC orders, read-only.
 */
export async function getB2BDashboardData(
  userId: string,
  fullName: string,
  prefetchedProfile?: Profile | null
): Promise<CustomerDashboardData> {
  const supabase = await createClient();
  const assignedOrderIds = await getB2BAssignedOrderIds(userId);
  return unstable_cache(
    async (id: string, name: string, ids: string[]) => {
      return fetchDashboardDataQuery(supabase, id, name, {
        assignedOrderIds: ids,
        readOnly: true,
      }, prefetchedProfile);
    },
    [`b2b-dashboard-${userId}`],
    {
      revalidate: 30,
      tags: [`customer-dashboard-${userId}`, `b2b-assignments-${userId}`, `notif-list-${userId}`],
    }
  )(userId, fullName, assignedOrderIds);
}

export const getCachedB2BDashboardData = cache(async (
  userId: string,
  fullName: string,
  prefetchedProfile?: Profile | null
) => {
  return getB2BDashboardData(userId, fullName, prefetchedProfile);
});
