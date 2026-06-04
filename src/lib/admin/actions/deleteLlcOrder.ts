'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { v2 as cloudinary } from 'cloudinary';
import { revalidateTag } from 'next/cache';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function deleteLlcOrder(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. Enforce admin/manager role
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return { success: false, error: 'Unauthorized: Admin or Manager role required' };
    }

    const admin = createAdminClient();

    // 2. Fetch all documents for storage cleanup
    const { data: docs } = await admin
      .from('documents')
      .select('id, storage_type, public_id, storage_path')
      .eq('order_id', orderId);

    // 3. Delete files from Cloudinary
    const cloudinaryDocs = (docs || []).filter(
      (d: any) => d.storage_type === 'cloudinary' && d.public_id
    );
    await Promise.allSettled(
      cloudinaryDocs.map((d: any) =>
        cloudinary.uploader.destroy(d.public_id, { resource_type: 'raw' }).catch(() =>
          cloudinary.uploader.destroy(d.public_id, { resource_type: 'image' })
        )
      )
    );

    // 4. Delete files from Supabase Storage
    const supabaseDocs = (docs || []).filter(
      (d: any) => d.storage_type === 'supabase' && d.storage_path
    );
    await Promise.allSettled(
      supabaseDocs.map(async (d: any) => {
        const storagePath = d.storage_path as string;
        const slashIdx = storagePath.indexOf('/');
        if (slashIdx === -1) return;
        const bucket = storagePath.slice(0, slashIdx);
        const filePath = storagePath.slice(slashIdx + 1);
        await admin.storage.from(bucket).remove([filePath]);
      })
    );

    // 5. Delete all related DB records (use service role to bypass RLS)
    await Promise.all([
      admin.from('documents').delete().eq('order_id', orderId),
      admin.from('document_resubmission_requests').delete().eq('order_id', orderId),
      admin.from('order_internal_addons').delete().eq('order_id', orderId),
      admin.from('admin_order_views').delete().eq('order_id', orderId),
      admin.from('order_status_history').delete().eq('order_id', orderId),
    ]);

    // 6. Nullify coupon_usages.order_id (preserve audit trail, just unlink)
    await admin
      .from('coupon_usages')
      .update({ order_id: null } as any)
      .eq('order_id', orderId);

    // 7. Delete the order itself
    const { error: deleteErr } = await admin
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (deleteErr) {
      return { success: false, error: deleteErr.message };
    }

    // 8. Bust all related caches
    revalidateTag('order-list-llc', 'max');
    revalidateTag('order-list-llc-stats', 'max');
    revalidateTag(`order-${orderId}`, 'max');
    revalidateTag('overview-stats', 'max');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'An unexpected error occurred' };
  }
}
