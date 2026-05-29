/**
 * @file src/lib/admin/getOrderDetail.ts
 * @description Highly optimized, cached order detail fetcher complying with Next.js 15+ caching rules.
 * 
 * FIX 2: createClient() is called OUTSIDE unstable_cache boundary.
 * The active client is captured via closure to prevent dynamic cookies() calls inside cache.
 */

import { createClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';
import { formatLlcName } from './formatters';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type {
  OrderDetail,
  OrderMember,
  OrderDocument,
  OrderStatusHistory,
  ResubmissionRequest,
  OrderStatus,
} from '@/types/admin';

// createClient() must remain outside unstable_cache — see FIX 2
export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  // Validate orderId UUID structure
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orderId)) {
    return null;
  }

  const supabase = await createClient();

  const runQuery = async (client: SupabaseClient<Database>): Promise<OrderDetail | null> => {
    // Parallel queries to fetch core order data, documents, status history, and resubmission requests
    const [orderRes, docsRes, historyRes, resubmitRes] = await Promise.all([
      (client as any)
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
        .eq('id', orderId)
        .single(),
      (client as any)
        .from('documents')
        .select('*'), // Filtered post-query based on order's user_id to ensure RLS compliance
      (client as any)
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
      (client as any)
        .from('document_resubmission_requests')
        .select('*')
        .eq('order_id', orderId)
        .eq('status', 'pending'),
    ]);

    if (orderRes.error || !orderRes.data) {
      console.error('[getOrderDetail Error fetching order]:', orderRes.error);
      return null;
    }

    const order = orderRes.data as any;
    const clientProfile = order.profiles as any;

    const allDocs = (docsRes.data || []) as Array<Record<string, unknown>>;
    const clientDocs = allDocs.filter(d => {
      if (d.profile_id !== order.user_id) return false;
      if (d.order_id === orderId) return true;
      if (!d.order_id && !d.superseded_at) return true;
      return false;
    });

    const documents: OrderDocument[] = clientDocs.map((doc) => ({
      id: doc.id as string,
      documentType: doc.document_type as string,
      fileName: doc.file_name as string,
      fileSize: (doc.file_size as number) ?? null,
      mimeType: (doc.mime_type as string) ?? null,
      url: doc.url as string,
      uploadedAt: (doc.uploaded_at as string) || new Date().toISOString(),
      isVerified: (doc.is_verified as boolean) || false,
      slotKey: (doc.slot_key as string) ?? null,
      publicId: (doc.public_id as string) ?? null,
      storagePath: (doc.storage_path as string) ?? null,
      supersededAt: (doc.superseded_at as string) ?? null,
      isActive: !doc.superseded_at,
    }));

    // Map status history to OrderStatusHistory types
    const statusHistory: OrderStatusHistory[] = ((historyRes.data || []) as any[]).map((h: any) => ({
      id: h.id,
      oldStatus: h.old_status,
      newStatus: h.new_status,
      changedBy: h.profiles?.full_name || 'System / Admin',
      changedAt: h.changed_at,
      note: h.note,
    }));

    // Map resubmission requests
    const resubmissionRequests: ResubmissionRequest[] = ((resubmitRes.data || []) as any[]).map((r: any) => ({
      id: r.id,
      memberIndex: r.member_index,
      fieldName: r.field_name,
      requestedAt: r.requested_at,
      status: r.status as 'pending' | 'resubmitted' | 'cancelled',
      note: r.note,
    }));


    // Parse form snapshot
    const formSnapshot = (order.form_snapshot as Record<string, any>) || {};

    // Get Raw business name from snapshot (support both flat and step3 hierarchies)
    const rawBusinessName =
      formSnapshot?.step3?.businessName ?? formSnapshot?.businessName ?? '';

    // Get and parse members
    const rawMembers =
      formSnapshot?.step4?.members ?? formSnapshot?.members ?? [];
    
    const members: OrderMember[] = (Array.isArray(rawMembers) ? rawMembers : []).map((m: Record<string, unknown>, idx: number) => {
      const hasResubmitRequest = resubmissionRequests.some(
        (r) => r.memberIndex === idx && r.fieldName === 'id_document'
      );

      const slotKey = (m.slotKey as string) ?? `member_${idx}_passport`;
      const snapshotUrl = (m.documentUrl as string) ?? (m.idDocUrl as string) ?? null;

      const activeDoc =
        documents.find(
          d => d.slotKey === slotKey && d.isActive !== false
        ) ??
        (snapshotUrl
          ? documents.find(d => d.url === snapshotUrl && d.isActive !== false)
          : undefined);

      const addressLine =
        (m.addressLine1 as string) ??
        (m.address as string) ??
        '';

      return {
        index: idx,
        position: (m.position as string) ?? 'Founder',
        name: (m.fullName as string) ?? (m.name as string) ?? 'Unnamed Member',
        address: addressLine,
        city: (m.city as string) ?? '',
        state: (m.state as string) ?? '',
        country: (m.country as string) ?? '',
        idDocUrl: activeDoc?.url ?? snapshotUrl,
        hasResubmitRequest,
      };
    });

    // Map addons
    const selectedAddons = order.selected_addons || [];
    const addonsSnapshot = (order.addons_snapshot as Record<string, any>[]) || [];

    // Map entity types, member types, packages with overrides
    const entityType =
      order.admin_override_entity_type ?? formSnapshot?.step1?.entityType ?? formSnapshot?.entityType ?? null;
    const memberType =
      order.admin_override_member_type ?? formSnapshot?.step1?.memberType ?? formSnapshot?.memberType ?? null;
    const formationPackage =
      order.admin_override_formation_package ??
      order.formation_package ??
      formSnapshot?.step2?.selectedPackageId ??
      formSnapshot?.step2?.package ??
      formSnapshot?.selectedPackageId ??
      formSnapshot?.formationPackage ??
      null;
    const formationPackageName =
      formSnapshot?.step2?.packageName ??
      formSnapshot?.selectedPackageName ??
      null;

    return {
      id: order.id,
      orderNumber: order.order_number || '',
      status: order.status as OrderStatus,
      paymentStatus: order.payment_status as any,
      llcName: formatLlcName(rawBusinessName),
      formationState: order.formation_state || formSnapshot?.step2?.state || null,
      formationStateName: order.formation_state_name || formSnapshot?.step2?.stateName || null,
      createdAt: order.created_at,
      submittedAt: order.submitted_at,
      clientId: order.user_id,
      clientName: clientProfile?.full_name || 'Unnamed Client',
      clientEmail: clientProfile?.email || '',
      clientPhone: clientProfile?.phone || null,
      entityType,
      memberType,
      formationPackage,
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
  };

  // Cached fetching using unstable_cache wrapping our runQuery
  return unstable_cache(
    async (oid: string): Promise<OrderDetail | null> => {
      return runQuery(supabase);
    },
    [`order-${orderId}`],
    {
      revalidate: 60,
      tags: [`order-${orderId}`, 'order-list-llc'],
    }
  )(orderId);
}
