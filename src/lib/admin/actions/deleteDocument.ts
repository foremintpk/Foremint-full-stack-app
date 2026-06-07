/**
 * @file src/lib/admin/actions/deleteDocument.ts
 * @description Server Action to delete a document row from public.documents and log it to audit_logs.
 * 
 * FIX 1: Calls rpc('get_my_role') to check admin user role, avoiding direct recursive profiles query.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateTag } from 'next/cache';

export async function deleteDocument(
  documentId: string,
  orderId: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Only administrators may delete documents
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || role !== 'administrator') {
      return { success: false, error: 'Unauthorized: Administrator role required' };
    }

    // 1. Fetch document row to inspect metadata and file parameters
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !doc) {
      return { success: false, error: 'Document not found' };
    }

    // 2. Write to audit_logs to preserve old URL and audit records
    const { error: auditError } = await createAdminClient()
      .from('audit_logs')
      .insert({
        actor_id: adminId,
        action: 'delete_document',
        entity_type: 'document',
        entity_id: documentId,
        metadata: {
          url: doc.url,
          fileName: doc.file_name,
          documentType: doc.document_type,
          deleted_at: new Date().toISOString(),
          preserved_reason: 'Audit compliance requirement for immutable logs.',
        },
      });

    if (auditError) {
      console.error('[deleteDocument Audit Log Error]:', auditError);
    }

    // 3. Delete file physically from Supabase Storage if applicable
    if (doc.storage_type === 'supabase' && doc.url) {
      try {
        // Try parsing storage path or use existing storage_path column
        const storagePath = doc.storage_path || doc.url.split('/public/')[1]?.split('?')[0];
        if (storagePath) {
          const parts = storagePath.split('/');
          const bucket = parts[0];
          const pathInsideBucket = parts.slice(1).join('/');

          if (bucket && pathInsideBucket) {
            await supabase.storage.from(bucket).remove([pathInsideBucket]);
          }
        }
      } catch (storageErr) {
        console.error('[deleteDocument Storage Error - proceeding anyway]:', storageErr);
      }
    }

    // 4. Delete the row from the database documents table
    const { error: deleteError } = await (supabase as any)
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    // 5. Invalidate relevant caches
    revalidateTag(`order-${orderId}`, 'max');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'An unexpected error occurred' };
  }
}

