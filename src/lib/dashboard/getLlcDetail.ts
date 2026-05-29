import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { formatLlcName } from '../admin/formatters';
import type { OrderDetail, OrderDocument, OrderMember, OrderStatusHistory, ResubmissionRequest } from '@/types/admin';

async function fetchLlcDetailQuery(
  supabase: any,
  orderId: string,
  userId: string
): Promise<OrderDetail | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orderId)) {
    return null;
  }

  // Fetch the order and verify the customer owns it
  const { data: orderRes, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      profiles!user_id (
        id,
        email,
        full_name,
        phone
      ),
      companies!company_id (
        *
      )
    `)
    .eq('id', orderId)
    .eq('user_id', userId)
    .single();

  if (orderError || !orderRes) {
    console.error('[fetchLlcDetailQuery Error]:', orderError);
    return null;
  }

  const order = orderRes as any;
  const clientProfile = order.profiles as any;
  const company = order.companies as any;

  // Parallel queries to fetch documents, status history, and resubmission requests
  const [docsRes, historyRes, resubmitRes, internalAddonsRes] = await Promise.all([
    supabase
      .from('documents')
      .select('*')
      .eq('profile_id', userId)
      .or(`order_id.eq.${orderId},order_id.is.null`),
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
  ]);

  const clientDocs = (docsRes.data || []) as any[];
  
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

  // Format internal addons
  const addonsSnapshot = (order.addons_snapshot as any[]) || [];
  const selectedAddons = order.selected_addons || [];

  // Parse form snapshot
  const formSnapshot = (order.form_snapshot as Record<string, any>) || {};
  const rawBusinessName = formSnapshot?.step3?.businessName ?? formSnapshot?.businessName ?? '';
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
      idDocUrl: activeDoc?.url ?? snapshotUrl,
      hasResubmitRequest,
    };
  });

  return {
    id: order.id,
    orderNumber: order.order_number || '',
    status: order.status,
    paymentStatus: order.payment_status as any,
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
