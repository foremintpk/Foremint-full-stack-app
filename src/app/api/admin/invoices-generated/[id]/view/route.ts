/**
 * @file src/app/api/admin/invoices-generated/[id]/view/route.ts
 * @description Serves a stored invoice PDF through an authenticated route.
 *
 * The Cloudinary URL is built and fetched server-side; only the bytes come
 * back. An invoice carries a client's name and what they were charged, so the
 * storage URL is never handed to the browser.
 *
 * `?download=1` sends it as an attachment instead of inline.
 */

import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireInvoiceAccess, Ss4ForbiddenError } from '@/lib/services/ss4/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await requireInvoiceAccess();

    const { id } = await params;
    if (!UUID.test(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    const { data, error } = await createAdminClient()
      .from('generated_invoices')
      .select('document_url, document_public_id, file_name')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: `Lookup failed: ${error.message}` }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const row = data as unknown as {
      document_url: string | null;
      document_public_id: string | null;
      file_name: string;
    };

    if (!row.document_url && !row.document_public_id) {
      return NextResponse.json(
        { error: 'This invoice has no stored file — regenerate it to restore the PDF.' },
        { status: 404 }
      );
    }

    // Signed URL built server-side only. Invoices upload as resource_type
    // 'raw'; the other bucket is tried as a fallback for any older row.
    const candidates: string[] = [];
    if (row.document_public_id) {
      for (const resourceType of ['raw', 'image']) {
        candidates.push(
          cloudinary.url(row.document_public_id, {
            resource_type: resourceType,
            sign_url: true,
            secure: true,
            type: 'upload',
          })
        );
      }
    }
    if (row.document_url) candidates.push(row.document_url);

    let upstream: Response | null = null;
    let lastStatus = 502;
    for (const url of candidates) {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) { upstream = res; break; }
      lastStatus = res.status;
    }

    if (!upstream) {
      return NextResponse.json(
        { error: `Could not retrieve the stored invoice (HTTP ${lastStatus}).` },
        { status: 502 }
      );
    }

    const bytes = await upstream.arrayBuffer();
    const isDownload = req.nextUrl.searchParams.get('download') === '1';

    const fileName = row.file_name || 'invoice.pdf';
    // Customer names can carry characters that make an invalid header value;
    // send a sanitised ASCII name plus the RFC 5987 form.
    const ascii = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '');

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          `${isDownload ? 'attachment' : 'inline'}; filename="${ascii}"; ` +
          `filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
