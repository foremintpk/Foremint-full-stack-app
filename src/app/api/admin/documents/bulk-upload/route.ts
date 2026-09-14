/**
 * @file src/app/api/admin/documents/bulk-upload/route.ts
 * @description Stores one reviewed file against its LLC order.
 *
 * One file per request so a large batch cannot exceed the function timeout, and
 * so a single failure reports itself without taking down the rest of the run.
 *
 * Mirrors the per-order upload route's conventions exactly — Cloudinary with
 * resource_type 'raw' for PDFs, version supersession on fixed slots, and a
 * `documents` row owned by the order's customer — so anything uploaded here is
 * indistinguishable from a document uploaded on the order screen itself.
 */

import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSs4Admin, Ss4ForbiddenError } from '@/lib/services/ss4/guard';
import { CATEGORY_LABELS, type DocumentCategory } from '@/lib/services/documents/matcher';
import { revalidateOrder } from '@/lib/admin/actions/revalidateOrder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

cloudinary.config({
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BYTES = 10 * 1024 * 1024; // matches the existing per-order route

const VALID_CATEGORIES: DocumentCategory[] = [
  'articles_of_organization',
  'operating_agreement',
  'ein_letter',
  'additional',
];

/** Accepted types. Operating agreements are frequently .docx, so those pass. */
const ALLOWED_EXTENSIONS = /\.(pdf|jpe?g|png|webp|docx?|xlsx?)$/i;

export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireSs4Admin();
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Could not read the upload.' }, { status: 400 });
  }

  const file = form.get('file') as File | null;
  const orderId = String(form.get('orderId') ?? '').trim();
  const category = String(form.get('category') ?? '').trim() as DocumentCategory;
  const customTitle = String(form.get('title') ?? '').trim();

  // --- Validation ----------------------------------------------------------
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }
  if (!UUID.test(orderId)) {
    return NextResponse.json({ error: 'A valid order must be selected.' }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: `Unknown document category "${category}".` }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'That file is empty.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.` },
      { status: 400 }
    );
  }
  if (!ALLOWED_EXTENSIONS.test(file.name)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Upload a PDF, image, or Word/Excel document.' },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  // The document row belongs to the order's customer, not the admin, so the
  // client can see it in their own dashboard.
  const { data: order, error: orderError } = await db
    .from('orders')
    .select('id, user_id, order_number')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json({ error: `Could not load the order: ${orderError.message}` }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: 'That order no longer exists.' }, { status: 404 });
  }

  const { user_id: userId, order_number: orderNumber } = order as unknown as {
    user_id: string;
    order_number: string | null;
  };

  // --- Upload --------------------------------------------------------------
  let uploadUrl: string;
  let publicId: string;
  let resourceType: string;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

    const result = await new Promise<{ secure_url: string; public_id: string; resource_type: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: `foremint/orders/${orderId}`,
              // PDFs keep their extension in the public_id so Cloudinary serves
              // real PDF bytes rather than trying to transform them.
              public_id: isPdf ? `${Date.now()}-${safeName}` : `${Date.now()}-${safeName.split('.')[0]}`,
              resource_type: isPdf ? 'raw' : 'auto',
            },
            (err, uploaded) => {
              if (err || !uploaded) {
                reject(err ?? new Error('Cloudinary returned no result.'));
                return;
              }
              resolve(uploaded as { secure_url: string; public_id: string; resource_type: string });
            }
          )
          .end(buffer);
      }
    );

    uploadUrl = result.secure_url;
    publicId = result.public_id;
    resourceType = result.resource_type;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload to storage failed.';
    return NextResponse.json({ error: `Storage upload failed: ${message}` }, { status: 502 });
  }

  // --- Supersede the previous version of a fixed slot -----------------------
  // 'additional' is a multi-document slot, so nothing is superseded there.
  if (category !== 'additional') {
    const { error: supersedeError } = await db
      .from('documents')
      .update({ superseded_at: new Date().toISOString() } as never)
      .eq('order_id', orderId)
      .eq('slot_key', category)
      .is('superseded_at', null);

    // Not fatal: the new row is still the newest. Logged so a stuck duplicate
    // can be traced later.
    if (supersedeError) {
      console.error(`[documents] supersede failed for ${orderNumber}/${category}: ${supersedeError.message}`);
    }
  }

  // --- Record --------------------------------------------------------------
  const documentType =
    category === 'additional' && customTitle ? customTitle : CATEGORY_LABELS[category];

  const { data: inserted, error: insertError } = await db
    .from('documents')
    .insert({
      order_id: orderId,
      profile_id: userId,
      slot_key: category,
      document_type: documentType,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      url: uploadUrl,
      public_id: publicId,
      storage_type: 'cloudinary',
      cloudinary_resource_type: resourceType,
      uploaded_at: new Date().toISOString(),
    } as never)
    .select('id')
    .single();

  if (insertError) {
    // The file is in Cloudinary but unreferenced. Remove it rather than leave
    // an orphan the operator cannot see or clean up.
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch {
      console.error(`[documents] orphaned Cloudinary asset ${publicId} after a failed insert.`);
    }
    return NextResponse.json(
      { error: `Could not record the document: ${insertError.message}` },
      { status: 500 }
    );
  }

  // Refresh the order screen so the new document shows immediately.
  try {
    await revalidateOrder(orderId);
  } catch {
    // A stale cache is not worth failing a successful upload over.
  }

  return NextResponse.json({
    success: true,
    documentId: (inserted as { id: string }).id,
    orderNumber,
    category,
    fileName: file.name,
    url: uploadUrl,
    uploadedBy: admin.id,
  });
}
