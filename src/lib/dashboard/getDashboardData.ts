import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { formatLlcName } from '../admin/formatters';
import type {
  CustomerDashboardData,
  CustomerLlcItem,
  CustomerActionRequired,
  CustomerNotification,
  CustomerInvoiceItem,
  CustomerDashboardStats,
} from '@/types/dashboard';

async function fetchDashboardDataQuery(
  supabase: any,
  userId: string,
  fullName: string,
  userEmail: string
): Promise<CustomerDashboardData> {

  // 1. Fetch user profile again to ensure fresh settings
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profileRow) {
    throw new Error('Profile not found');
  }

  // 2. Fetch all LLC orders for the customer
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select(`
      *,
      companies!company_id (
        id,
        company_name,
        state_renewal_date,
        state_renewal_fees,
        ein
      )
    `)
    .eq('user_id', userId)
    .ilike('order_type', '%llc%')
    .order('created_at', { ascending: false });

  if (ordersError) {
    console.error('[fetchDashboardDataQuery ordersError]:', ordersError);
  }

  const orders = ordersData || [];

  // 3. For any order without a linked company_id, check if a company exists or create one (auto-link like getOrderInternalData)
  const llcs: CustomerLlcItem[] = [];
  const autoLinkPromises = orders.map(async (o: any) => {
    let company = o.companies;
    let companyId = o.company_id;

    if (!companyId) {
      // Look up company by owner_id or create one
      const { data: existing } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle();

      if (existing) {
        company = existing;
        companyId = existing.id;
        // link order
        await supabase
          .from('orders')
          .update({ company_id: companyId })
          .eq('id', o.id);
      } else {
        const formSnapshot = o.form_snapshot || {};
        const businessName =
          formSnapshot?.step3?.businessName ?? formSnapshot?.businessName ?? `LLC for order ${o.order_number}`;

        const { data: newCompany, error: createError } = await supabase
          .from('companies')
          .insert({
            owner_id: userId,
            company_name: businessName,
            business_address: formSnapshot?.step3?.businessAddress || {},
            mailing_address: formSnapshot?.step3?.mailingAddress || {},
          })
          .select('*')
          .single();

        if (!createError && newCompany) {
          company = newCompany;
          companyId = newCompany.id;
          await supabase
            .from('orders')
            .update({ company_id: companyId })
            .eq('id', o.id);
        }
      }
    }

    // Determine compliance status
    let complianceState: CustomerLlcItem['complianceState'] = 'unknown';
    if (o.status === 'completed' || o.status === 'confirmed') {
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
    } else if (o.status === 'awaiting_documents') {
      complianceState = 'action_required';
    }

    const formSnapshot = o.form_snapshot || {};
    const rawBusinessName = formSnapshot?.step3?.businessName ?? formSnapshot?.businessName ?? '';

    llcs.push({
      id: o.id,
      companyId: companyId,
      llcName: formatLlcName(rawBusinessName || company?.company_name || `Order ${o.order_number}`),
      status: o.status,
      formationState: o.formation_state || formSnapshot?.step2?.state || null,
      formationStateName: o.formation_state_name || formSnapshot?.step2?.stateName || null,
      renewalDate: company?.state_renewal_date || null,
      pendingAmount: o.payment_status !== 'paid' ? Number(o.grand_total || 0) : 0,
      paymentStatus: o.payment_status,
      complianceState,
    });
  });

  await Promise.all(autoLinkPromises);

  // 4. Fetch pending document resubmission requests for user's orders
  const orderIds = orders.map((o: any) => o.id);
  let pendingResubmissions: any[] = [];
  if (orderIds.length > 0) {
    const { data: resubmits } = await supabase
      .from('document_resubmission_requests')
      .select('*')
      .in('order_id', orderIds)
      .eq('status', 'pending');
    pendingResubmissions = resubmits || [];
  }

  // 5. Build action items
  const actions: CustomerActionRequired[] = [];

  // Add document resubmission actions
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

  // Add payment actions for unpaid/partial orders
  llcs.forEach((llc) => {
    if (llc.paymentStatus !== 'paid') {
      const orderRecord = orders.find((o: any) => o.id === llc.id);
      actions.push({
        id: `pay-${llc.id}`,
        type: 'invoice_payment',
        title: `Complete Payment for ${llc.llcName}`,
        description: `Pending balance: $${orderRecord?.grand_total || 0}. Please upload bank transfer proof or use card payment.`,
        dueDate: null,
        priority: 'high',
        llcId: llc.id,
        llcName: llc.llcName,
        metadata: {
          amount: Number(orderRecord?.grand_total || 0),
          invoiceNumber: orderRecord?.order_number || '',
        },
      });
    }
  });

  // Add renewal actions if renewal_due
  llcs.forEach((llc) => {
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

  // 6. Fetch user notifications (personal or general customer)
  const { data: notificationsData } = await supabase
    .from('notifications')
    .select('id, title, body, type, link, is_read, created_at, payload')
    .or(`recipient_id.eq.${userId},and(recipient_id.is.null,target_role.eq.customer)`)
    .order('created_at', { ascending: false })
    .limit(30);

  const notifications: CustomerNotification[] = (notificationsData || []).map((n: any) => {
    let category: CustomerNotification['category'] = 'general';
    const typeLower = (n.type || '').toLowerCase();
    if (typeLower.includes('billing') || typeLower.includes('payment') || typeLower.includes('invoice')) {
      category = 'billing';
    } else if (typeLower.includes('compliance') || typeLower.includes('filing')) {
      category = 'compliance';
    } else if (typeLower.includes('renewal')) {
      category = 'renewal';
    } else if (typeLower.includes('document') || typeLower.includes('resubmit') || typeLower.includes('reject')) {
      category = 'document';
    }

    return {
      id: n.id,
      title: n.title || 'Notification',
      body: n.body,
      type: n.type,
      link: n.link,
      isRead: !!n.is_read,
      createdAt: n.created_at || new Date().toISOString(),
      category,
    };
  });

  // 7. Fetch custom billing invoices matching user's full_name
  const invoices: CustomerInvoiceItem[] = [];

  // First, map orders as billing items
  orders.forEach((o: any) => {
    const formSnapshot = o.form_snapshot || {};
    const rawBusinessName = formSnapshot?.step3?.businessName ?? formSnapshot?.businessName ?? '';
    const nameLabel = formatLlcName(rawBusinessName || `LLC Formation Order ${o.order_number}`);

    invoices.push({
      id: o.id,
      invoiceNumber: o.order_number || `ORD-${o.id.slice(0, 8).toUpperCase()}`,
      date: o.submitted_at || o.created_at,
      name: nameLabel,
      amount: Number(o.grand_total || 0),
      status: o.payment_status as any,
      type: 'order',
      notes: o.notes,
      downloadUrl: o.payment_receipt_url,
    });
  });

  // Second, look up from public.invoices table by matching owner's name
  if (fullName) {
    const { data: manualInvoices } = await supabase
      .from('invoices')
      .select('*')
      .ilike('name', `%${fullName}%`)
      .order('date', { ascending: false });

    (manualInvoices || []).forEach((row: any) => {
      // Prevent duplicates if already added
      invoices.push({
        id: row.id,
        invoiceNumber: row.invoice_number,
        date: row.date,
        name: row.name,
        amount: Number(row.total_amount_pkr) || 0, // PKR or USD? The database column total_amount_pkr stores PKR
        status: 'paid', // Admin created invoices are usually logged payouts or paid records
        type: 'manual',
        notes: row.notes,
      });
    });
  }

  // 8. Calculate stats
  const totalLlcs = llcs.length;
  const activeLlcs = llcs.filter((l) => l.status === 'completed' || l.status === 'confirmed').length;
  const pendingActions = actions.filter((a) => a.priority === 'high').length;
  const pendingPayments = llcs.filter((l) => l.paymentStatus !== 'paid').length;

  const upcomingRenewals = llcs.filter((l) => {
    if (!l.renewalDate) return false;
    const renewalDate = new Date(l.renewalDate);
    const today = new Date();
    const diffTime = renewalDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 60; // Next 60 days
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

export async function getDashboardData(userId: string, fullName: string, userEmail: string): Promise<CustomerDashboardData> {
  const supabase = await createClient();
  return unstable_cache(
    async (id: string, name: string, email: string) => {
      return fetchDashboardDataQuery(supabase, id, name, email);
    },
    [`customer-dashboard-${userId}`],
    {
      revalidate: 30, // 30 seconds TTL
      tags: [`customer-dashboard-${userId}`, `notif-list-${userId}`, `order-list-${userId}`],
    }
  )(userId, fullName, userEmail);
}

// React cache wrapper for render-tree deduplication
export const getCachedDashboardData = cache(async () => {
  const session = await getSession();
  const name = session.profile.full_name || '';
  const email = session.profile.email || '';
  return getDashboardData(session.user.id, name, email);
});
