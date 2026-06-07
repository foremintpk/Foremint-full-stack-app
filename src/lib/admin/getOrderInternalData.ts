/**
 * @file src/lib/admin/getOrderInternalData.ts
 * @description Fetches all internal operations details for a single LLC order.
 * Implements strict Next.js App Router caching with unstable_cache and tags.
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hydrateSupabaseDocumentUrls } from '@/lib/storage/document-urls';
import type {
  FormationDetails,
  OrderDocument,
  InternalAddon,
  OrderBilling,
} from '@/types/admin';

interface OrderInternalData {
  formationDetails: FormationDetails;
  documents: OrderDocument[];
  internalAddons: InternalAddon[];
  billing: OrderBilling;
}

export async function getOrderInternalData(orderId: string): Promise<OrderInternalData | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orderId)) {
    return null;
  }

  const supabase = await createClient();
  const adminSdk = createAdminClient();

  const runQuery = async (): Promise<OrderInternalData | null> => {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[getOrderInternalData Error fetching order]:', orderError);
      return null;
    }

    const o = order as any;
    const companyId = o.company_id;

    let formationDetails: FormationDetails = {
      einNumber: null,
      filingId: null,
      formationDate: null,
      stateRenewalDate: null,
      stateRenewalFees: null,
      mailingAddress: null,
      tradingAddress: null,
      businessAddress: null,
    };

    if (companyId) {
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (company) {
        formationDetails = {
          einNumber: company.ein || null,
          filingId: (company as any).filing_id || null,
          formationDate: (company as any).formation_date || null,
          stateRenewalDate: (company as any).state_renewal_date || null,
          stateRenewalFees: (company as any).state_renewal_fees ? Number((company as any).state_renewal_fees) : null,
          mailingAddress: (company.mailing_address as any) || null,
          tradingAddress: ((company as any).trading_address as any) || null,
          businessAddress: (company.business_address as any) || null,
        };
      }
    }

    const { data: docs } = await (supabase as any)
      .from('documents')
      .select('*')
      .eq('order_id', orderId)
      .order('uploaded_at', { ascending: false });

    const clientDocs = (docs || []) as any[];
    await hydrateSupabaseDocumentUrls(clientDocs, adminSdk);

    const documents: OrderDocument[] = clientDocs.map((doc: any) => ({
      id: doc.id,
      documentType: doc.document_type || 'Internal Doc',
      fileName: doc.file_name,
      fileSize: doc.file_size,
      mimeType: doc.mime_type,
      url: doc.url,
      uploadedAt: doc.uploaded_at || new Date().toISOString(),
      isVerified: doc.is_verified || false,
      slotKey: doc.slot_key || null,
      publicId: doc.public_id || null,
      storagePath: doc.storage_path || null,
      supersededAt: doc.superseded_at || null,
      isActive: !doc.superseded_at,
      cloudinaryResourceType: doc.cloudinary_resource_type || null,
    }));

    const { data: internalAddonsRes } = await (supabase as any)
      .from('order_internal_addons')
      .select('*')
      .eq('order_id', orderId)
      .is('removed_at', null)
      .order('assigned_at', { ascending: true });

    const internalAddons: InternalAddon[] = (internalAddonsRes || []).map((addon: any) => ({
      id: addon.id,
      orderId: addon.order_id,
      addonId: addon.addon_id,
      addonName: addon.addon_name,
      addonPrice: Number(addon.addon_price || 0),
      description: addon.description || null,
      documentId: addon.document_id || null,
      documentUrl: null, // to be populated if document exists
      assignedBy: addon.assigned_by,
      assignedAt: addon.assigned_at,
      removedAt: addon.removed_at || null,
    }));

    // Retrieve document URLs for internal addons if assigned
    const docIds = internalAddons.map(a => a.documentId).filter(Boolean) as string[];
    if (docIds.length > 0) {
      const { data: addonDocs } = await (supabase as any)
        .from('documents')
        .select('id, url')
        .in('id', docIds);

      if (addonDocs) {
        internalAddons.forEach(addon => {
          if (addon.documentId) {
            const doc = addonDocs.find((d: any) => d.id === addon.documentId);
            if (doc) {
              addon.documentUrl = doc.url;
            }
          }
        });
      }
    }

    // 6. Compute billing details
    const packagePrice = Number(o.package_price || 0);
    // State fees fallback to orders.state_fee if renewal fee is not set
    const stateFee = formationDetails.stateRenewalFees !== null 
      ? formationDetails.stateRenewalFees 
      : Number(o.state_fee || 0);

    const customerAddonsTotal = Number(o.addons_total || 0);
    const internalAddonsTotal = internalAddons.reduce((acc, curr) => acc + curr.addonPrice, 0);
    const grandTotalUsd = packagePrice + stateFee + customerAddonsTotal + internalAddonsTotal;

    const billing: OrderBilling = {
      packagePrice,
      stateFee,
      customerAddonsTotal,
      internalAddonsTotal,
      grandTotalUsd,
      grandTotalPkr: o.grand_total_pkr ? Number(o.grand_total_pkr) : null,
      advanceAmount: o.advance_amount ? Number(o.advance_amount) : null,
      advancePaymentDate: o.advance_payment_date || null,
      discountPkr: o.discount_pkr ? Number(o.discount_pkr) : null,
      secondPaymentAmount: o.second_payment_amount ? Number(o.second_payment_amount) : null,
    };

    return {
      formationDetails,
      documents,
      internalAddons,
      billing,
    };
  };

  return runQuery();
}




