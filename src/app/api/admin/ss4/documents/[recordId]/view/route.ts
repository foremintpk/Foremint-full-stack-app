/**
 * @file src/app/api/admin/ss4/documents/[recordId]/view/route.ts
 * @description Serves a generated SS-4 packet through an authenticated route.
 *
 * WHY THIS EXISTS. ss4_documents stored the raw res.cloudinary.com URL and the
 * UI linked straight to it. That link works for anyone who has it — no session,
 * no expiry — and an SS-4 carries the responsible party's name and address. This
 * mirrors /api/documents/[docId]/view: the upstream URL is built and fetched
 * server-side, and only the bytes come back, so the client never sees Cloudinary.
 *
 * `?download=1` sends it as an attachment instead of inline.
 */

import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSs4Admin, Ss4ForbiddenError } from '@/lib/services/ss4/guard';

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
  { params }: { params: Promise<{ recordId: string }> | { recordId: string } }
) {
  try {
    // SS-4 packets are administrator-only, like the rest of the EIN section.
    await requireSs4Admin();

    const { recordId } = await params;
    if (!UUID.test(recordId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    const { data, error } = await createAdminClient()
      .from('ss4_documents')
      .select('document_url, document_public_id, order_number, company_name, attempt_count')
      .eq('id', recordId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: `Lookup failed: ${error.message}` }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const row = data as unknown as {
      document_url: string | null;
      document_public_id: string | null;
      order_number: string;
      company_name: string | null;
      attempt_count: number;
    };

    if (!row.document_url && !row.document_public_id) {
      return NextResponse.json(
        { error: 'This record has no stored document — the run failed before upload.' },
        { status: 404 }
      );
    }

    // Signed URL built server-side only; it is never returned to the client.
    // Packets are uploaded as resource_type 'raw', with the other buckets tried
    // as a fallback for any row written differently.
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
        { error: `Could not retrieve the stored document (HTTP ${lastStatus}).` },
        { status: 502 }
      );
    }

    const bytes = await upstream.arrayBuffer();
    const isDownload = req.nextUrl.searchParams.get('download') === '1';

    const fileName = `${row.order_number} - ${row.company_name ?? 'SS-4'} - attempt ${row.attempt_count}.pdf`;
    // Company names come from filed documents and can hold characters that make
    // an invalid header value; send a sanitised ASCII name plus the RFC 5987 form.
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
