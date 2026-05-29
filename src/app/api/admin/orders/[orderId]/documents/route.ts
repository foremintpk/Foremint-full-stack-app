/**
 * @file src/app/api/admin/orders/[orderId]/documents/route.ts
 * @description API route to handle document uploads, dynamic Cloudinary vs Supabase routing, and version control.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v2 as cloudinary } from 'cloudinary';
import { revalidateOrder } from '@/lib/admin/actions/revalidateOrder';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> | { orderId: string } }
) {
  try {
    const resolvedParams = await params;
    const orderId = resolvedParams.orderId;

    if (!UUID_REGEX.test(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Enforce admin/manager role authorization
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Fetch order to link the document to order owner (profile_id)
    const { data: order } = await supabase
      .from('orders')
      .select('user_id, order_number')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 3. Parse upload file form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const slotKey = formData.get('slotKey') as string; // 'articles_of_organization', 'operating_agreement', 'ein_letter', 'additional'
    const customTitle = formData.get('title') as string; // only for additional docs
    const adminId = formData.get('adminId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const isMemberIdentitySlot = /^member_\d+_passport$/.test(slotKey);
    const allowedSlots = [
      'articles_of_organization',
      'operating_agreement',
      'ein_letter',
      'additional',
      'payment_receipt',
    ];

    if (!allowedSlots.includes(slotKey) && !isMemberIdentitySlot) {
      return NextResponse.json({ error: 'Invalid document slot' }, { status: 400 });
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (Max 10MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}-${sanitizedFileName}`;

    let uploadUrl = '';
    let storageType: 'cloudinary' | 'supabase' = 'supabase';
    let storagePath: string | null = null;
    let publicId: string | null = null;

    // 4. Hybrid Routing Rule: > 100KB -> Cloudinary; <= 100KB -> Supabase Storage
    if (file.size > 100000) {
      // Cloudinary
      storageType = 'cloudinary';
      const uploadResult: any = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({
          folder: `foremint/orders/${orderId}`,
          public_id: `${timestamp}-${sanitizedFileName.split('.')[0]}`,
          resource_type: 'auto',
        }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }).end(buffer);
      });

      uploadUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;
    } else {
      // Supabase Storage
      storageType = 'supabase';
      const bucketName = 'onboarding-documents';
      const path = `${orderId}/internal_ops/${uniqueFileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(path, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      storagePath = `${bucketName}/${path}`;
      
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(path);

      uploadUrl = publicUrl;
    }

    // 5. Version Control: Supersede old active versions of this fixed slot
    if (slotKey !== 'additional') {
      const { error: supersedeError } = await supabase
        .from('documents')
        .update({ superseded_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .eq('slot_key', slotKey)
        .is('superseded_at', null);

      if (supersedeError) {
        console.error('[Document Version Supersede Error]:', supersedeError);
      }
    }

    // Determine document type string
    let docType = 'Internal Operation Attachment';
    if (slotKey === 'articles_of_organization') docType = 'Articles of Organization';
    if (slotKey === 'operating_agreement') docType = 'Operating Agreement';
    if (slotKey === 'ein_letter') docType = 'EIN Confirmation Letter';
    if (slotKey === 'additional' && customTitle) docType = customTitle;
    if (isMemberIdentitySlot) docType = 'identity';
    if (slotKey === 'payment_receipt') docType = 'payment_receipt';

    // 6. Insert new document record
    const { data: docRecord, error: insertError } = await (supabase as any)
      .from('documents')
      .insert({
        profile_id: order.user_id,
        document_type: docType,
        storage_type: storageType,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        url: uploadUrl,
        public_id: publicId,
        storage_path: storagePath,
        uploaded_at: new Date().toISOString(),
        order_id: orderId,
        slot_key: slotKey,
      } as any)
      .select('*')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 7. Write to audit_logs
    if (adminId && UUID_REGEX.test(adminId)) {
      await supabase.from('audit_logs').insert({
        actor_id: adminId,
        action: 'upload_document',
        entity_type: 'document',
        entity_id: docRecord.id,
        metadata: {
          order_id: orderId,
          slot_key: slotKey,
          storage_type: storageType,
          file_name: file.name,
        },
      });
    }

    // 8. Revalidate cached tags and paths
    await revalidateOrder(orderId);

    return NextResponse.json({
      success: true,
      document: {
        id: docRecord.id,
        documentType: docRecord.document_type,
        fileName: docRecord.file_name,
        fileSize: docRecord.file_size,
        mimeType: docRecord.mime_type,
        url: docRecord.url,
        uploadedAt: docRecord.uploaded_at,
        isVerified: docRecord.is_verified,
        slotKey: docRecord.slot_key,
        publicId: docRecord.public_id,
        storagePath: docRecord.storage_path,
        supersededAt: docRecord.superseded_at,
        isActive: true,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
