import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hydrateSupabaseDocumentUrls } from '@/lib/storage/document-urls';
import { getSession } from '@/lib/auth/get-session';
import { formatLlcName } from '../admin/formatters';
import type { OrderDetail, OrderDocument, OrderMember, OrderStatusHistory, ResubmissionRequest, FormationDetails, InternalAddon, BillingEntry } from '@/types/admin';
import { computeBillingState } from './billing-utils';

async function fetchLlcDetailQuery(
  supabase: any,
  orderId: string,
  userId: string,
  opts?: { skipOwnerCheck?: boolean }
): Promise<OrderDetail | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orderId)) {
    return null;
  }

  // adminSdk is kept solely for hydrateSupabaseDocumentUrls (signs private Storage URLs).
  // All data queries now use the regular supabase client — RLS policies enforce access.
  const adminSdk = createAdminClient();

  // Fetch the order. For owners we additionally constrain by user_id; for B2B
  // (read-only) access the caller has already verified the assignment, so the
  // ownership filter is skipped and access is via the service-role client.
  let orderQuery = supabase
    .from('orders')
    .select(`
      *,
      profiles!user_id (
        id,
        email,
        full_name,
        phone
      )
    `)
    .eq('id', orderId);

  if (!opts?.skipOwnerCheck) {
    orderQuery = orderQuery.eq('user_id', userId);
  }

  const { data: orderRes, error: orderError } = await orderQuery.single();

  if (orderError || !orderRes) {
    console.error('[fetchLlcDetailQuery Error]:', orderError);
    return null;
  }

  const order = orderRes as any;
  const clientProfile = order.profiles as any;

  // Company fetch uses adminSdk because:
  // 1. Ownership is already verified above via the orders query.
  // 2. The companies table has new columns (filing_id, formation_date, etc.) added
  //    via migration — PostgREST's schema cache must be reloaded (NOTIFY pgrst,
  //    'reload schema') before the anon-key client can see them. adminSdk bypasses
  //    PostgREST and hits the DB directly, so it always sees all columns.
  let company: any = null;
  if (order.company_id) {
    const { data: companyData } = await adminSdk
      .from('companies')
      .select('*')
      .eq('id', order.company_id)
      .single();
    company = companyData;
  }

  // RLS policy "Customers can read order documents" enforces access.
  // billing_entries use adminSdk — only admins can read them via RLS.
  const [docsRes, historyRes, resubmitRes, internalAddonsRes, billingEntriesRes] = await Promise.all([
    supabase
      .from('documents')
      .select('*')
      .eq('order_id', orderId),
    supabase
      .from('order_status_history')
      .select(`
        id,
        old_status,
        new_status,
        changed_at,
        note,
        profiles!changed_by (
          full_name
        )
      `)
      .eq('order_id', orderId)
      .order('changed_at', { ascending: false }),
    supabase
      .from('document_resubmission_requests')
      .select('*')
      .eq('order_id', orderId)
      .order('requested_at', { ascending: false }),
    supabase
      .from('order_internal_addons')
      .select('*')
      .eq('order_id', orderId)
      .is('removed_at', null),
    adminSdk
      .from('billing_entries')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true }),
  ]);

  const clientDocs = (docsRes.data || []) as any[];

  // Replace stored public URLs with fresh signed URLs for private Supabase storage files.
  // Admin uploads ≤100KB go to the private 'onboarding-documents' bucket using getPublicUrl()
  // which returns an unusable URL when the bucket is not public. We fix this at read time.
  await hydrateSupabaseDocumentUrls(clientDocs, adminSdk);

  // Format documents
  const documents: OrderDocument[] = clientDocs.map((doc) => ({
    id: doc.id,
    documentType: doc.document_type,
    fileName: doc.file_name,
    fileSize: doc.file_size ?? null,
    mimeType: doc.mime_type ?? null,
    url: doc.url,
    uploadedAt: doc.uploaded_at || new Date().toISOString(),
    isVerified: !!doc.is_verified,
    slotKey: doc.slot_key ?? null,
    publicId: doc.public_id ?? null,
    storagePath: doc.storage_path ?? null,
    supersededAt: doc.superseded_at ?? null,
    isActive: !doc.superseded_at,
    cloudinaryResourceType: doc.cloudinary_resource_type ?? null,
  }));

  // Format status history
  const statusHistory: OrderStatusHistory[] = (historyRes.data || []).map((h: any) => ({
    id: h.id,
    oldStatus: h.old_status,
    newStatus: h.new_status,
    changedBy: h.profiles?.full_name || 'System / Admin',
    changedAt: h.changed_at,
    note: h.note,
  }));

  // Format resubmission requests
  const resubmissionRequests: ResubmissionRequest[] = (resubmitRes.data || []).map((r: any) => ({
    id: r.id,
    memberIndex: r.member_index,
    fieldName: r.field_name,
    requestedAt: r.requested_at,
    status: r.status as 'pending' | 'resubmitted' | 'cancelled',
    note: r.note,
  }));

  // Format billing entries (admin-recorded payments, discounts, charges)
  const billingEntries: BillingEntry[] = (billingEntriesRes.data || []).map((e: any) => ({
    id: e.id,
    title: e.title,
    amount: Number(e.amount || 0),
    type: e.type as 'discount' | 'charge' | 'payment',
    createdAt: e.created_at,
  }));

  // Format internal add-ons (admin-assigned post-order services)
  const internalAddons: InternalAddon[] = (internalAddonsRes.data || []).map((a: any) => ({
    id: a.id,
    orderId: a.order_id,
    addonId: a.addon_id,
    addonName: a.addon_name,
    addonPrice: Number(a.addon_price || 0),
    description: a.description || null,
    documentId: a.document_id || null,
    documentUrl: null,
    assignedBy: a.assigned_by,
    assignedAt: a.assigned_at,
    removedAt: a.removed_at || null,
  }));

  const addonsSnapshot = (order.addons_snapshot as any[]) || [];
  const selectedAddons = order.selected_addons || [];

  // Parse form snapshot
  const formSnapshot = (order.form_snapshot as Record<string, any>) || {};
  const rawBusinessName = formSnapshot?.step3?.businessName ?? formSnapshot?.businessName ?? '';

  // Coupon discount applied at checkout — stored in form_snapshot
  const couponDiscount = Number(
    formSnapshot?.coupon?.discountAmount ??
    formSnapshot?.step7?.coupon?.discountAmount ??
    0
  );
  const packageId =
    order.formation_package ||
    formSnapshot?.step2?.selectedPackageId ||
    formSnapshot?.step2?.package ||
    formSnapshot?.selectedPackageId ||
    null;
  let formationPackageName =
    formSnapshot?.step2?.packageName ??
    formSnapshot?.selectedPackageName ??
    null;

  if (!formationPackageName && packageId) {
    const { data: packageRow } = await supabase
      .from('packages')
      .select('name')
      .eq('id', packageId)
      .maybeSingle();

    formationPackageName = packageRow?.name ?? null;
  }

  // Get and parse members
  const rawMembers = formSnapshot?.step4?.members ?? formSnapshot?.members ?? [];
  const members: OrderMember[] = (Array.isArray(rawMembers) ? rawMembers : []).map((m: any, idx: number) => {
    const hasResubmitRequest = resubmissionRequests.some(
      (r) => r.memberIndex === idx && r.fieldName === 'id_document' && r.status === 'pending'
    );

    const slotKey = m.slotKey || `member_${idx}_passport`;
    const snapshotUrl = m.documentUrl || m.idDocUrl || null;

    const activeDoc =
      documents.find(
        d => d.slotKey === slotKey && d.isActive !== false
      ) ??
      (snapshotUrl
        ? documents.find(d => d.url === snapshotUrl && d.isActive !== false)
        : undefined);

    return {
      index: idx,
      position: m.position || 'Founder',
      name: m.fullName || m.name || 'Unnamed Member',
      address: m.addressLine1 || m.address || '',
      city: m.city || '',
      state: m.state || '',
      country: m.country || '',
      ssnItin: m.ssnItin || m.ssn || m.itin || null,
      idDocId: activeDoc?.id ?? null,
      idDocUrl: activeDoc?.url ?? snapshotUrl,
      hasResubmitRequest,
    };
  });

  // Map admin-set company details (stored in companies table by admin)
  const companyDetails: FormationDetails | null = company ? {
    einNumber: company.ein || null,
    filingId: company.filing_id || null,
    formationDate: company.formation_date || null,
    stateRenewalDate: company.state_renewal_date || null,
    stateRenewalFees: company.state_renewal_fees ? Number(company.state_renewal_fees) : null,
    businessAddress: company.business_address || null,
    mailingAddress: company.mailing_address || null,
    tradingAddress: company.trading_address || null,
  } : null;

  // Canonical payment status derived from billing entries — keeps the header badge,
  // the billing tab, and the dashboard list all in sync.
  const billingState = computeBillingState(Number(order.grand_total || 0), billingEntries);

  return {
    id: order.id,
    orderNumber: order.order_number || '',
    status: order.status,
    paymentStatus: billingState.status as any,
    llcName: formatLlcName(rawBusinessName || company?.company_name || `Order ${order.order_number}`),
    formationState: order.formation_state || formSnapshot?.step2?.state || null,
    formationStateName: order.formation_state_name || formSnapshot?.step2?.stateName || null,
    createdAt: order.created_at,
    submittedAt: order.submitted_at,
    clientId: order.user_id,
    clientName: clientProfile?.full_name || 'Unnamed Client',
    clientEmail: clientProfile?.email || '',
    clientPhone: clientProfile?.phone || null,
    entityType: order.entity_type || formSnapshot?.step1?.entityType || null,
    memberType: order.member_type || formSnapshot?.step1?.memberType || null,
    formationPackage: packageId,
    formationPackageName,
    grandTotal: Number(order.grand_total || 0),
    stateFee: Number(order.state_fee || 0),
    packagePrice: Number(order.package_price || 0),
    addonsTotal: Number(order.addons_total || 0),
    paymentReceiptUrl: order.payment_receipt_url || null,
    members,
    selectedAddons,
    addonsSnapshot,
    documents,
    statusHistory,
    resubmissionRequests,
    formSnapshot,
    companyDetails,
    internalAddons,
    billingEntries,
    couponDiscount,
  };
}

export async function getLlcDetail(orderId: string, userId: string): Promise<OrderDetail | null> {
  const supabase = await createClient();
  return unstable_cache(
    async (oid: string, uid: string) => {
      return fetchLlcDetailQuery(supabase, oid, uid);
    },
    [`llc-detail-${orderId}`],
    {
      revalidate: 60, // 60s TTL
      tags: [`order-${orderId}`, `llc-detail-${orderId}`],
    }
  )(orderId, userId);
}

export const getCachedLlcDetail = cache(async (orderId: string) => {
  const session = await getSession();
  return getLlcDetail(orderId, session.user.id);
});

// ── B2B (read-only) LLC detail ───────────────────────────────────────────────

/** True when the given order is assigned to the B2B user. */
async function isOrderAssignedToB2B(orderId: string, userId: string): Promise<boolean> {
  const adminSdk = createAdminClient();
  const { data, error } = await adminSdk
    .from('b2b_order_assignments')
    .select('id')
    .eq('b2b_user_id', userId)
    .eq('order_id', orderId)
    .maybeSingle();
  if (error) {
    console.error('[isOrderAssignedToB2B] error:', error);
    return false;
  }
  return !!data;
}

/**
 * Read-only LLC detail for a B2B customer. Returns null unless the order is
 * explicitly assigned to them. Reads via the service-role client since the order
 * is owned by a different (real) customer.
 */
export async function getB2BLlcDetail(orderId: string, userId: string): Promise<OrderDetail | null> {
  const assigned = await isOrderAssignedToB2B(orderId, userId);
  if (!assigned) return null;

  const adminSdk = createAdminClient();
  return unstable_cache(
    async (oid: string, uid: string) => {
      return fetchLlcDetailQuery(adminSdk, oid, uid, { skipOwnerCheck: true });
    },
    [`b2b-llc-detail-${orderId}-${userId}`],
    {
      revalidate: 60,
      tags: [`order-${orderId}`, `llc-detail-${orderId}`, `b2b-assignments-${userId}`],
    }
  )(orderId, userId);
}

export const getCachedB2BLlcDetail = cache(async (orderId: string) => {
  const session = await getSession();
  return getB2BLlcDetail(orderId, session.user.id);
});


