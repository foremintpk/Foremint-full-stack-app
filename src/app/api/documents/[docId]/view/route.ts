import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSignedSupabaseStorageUrl } from '@/lib/storage/document-urls';
import { canViewDocument } from '@/lib/auth/document-authorization';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> | { docId: string } }
) {
  try {
    const { docId } = await params;
    const isDownload = req.nextUrl.searchParams.get('download') === '1';

    if (!UUID_REGEX.test(docId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    const supabase = await createClient();
    const adminSdk = createAdminClient();

    // 1. Authenticate current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 2. Load user role
    const { data: role } = await supabase.rpc('get_my_role');

    // 3. Load document record (minimal fields for auth + serving)
    const { data: doc, error: docError } = await (supabase as any)
      .from('documents')
      .select('id, url, mime_type, file_name, public_id, storage_type, cloudinary_resource_type, storage_path, profile_id, order_id')
      .eq('id', docId)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // 4. Authorize based on role.
    // RLS policy "Customers can read order documents" already ensured the SELECT above
    // only returned rows the user is permitted to see. canViewDocument provides an
    // additional server-side check for belt-and-suspenders.
    let authorized = canViewDocument(
      role as string | null,
      user.id,
      { profile_id: doc.profile_id as string, order_id: doc.order_id as string | null }
    );

    // B2B (read-only) customers don't own the order, so canViewDocument returns false.
    // Grant read access when the document's order is explicitly assigned to them —
    // mirrors the assignment check used by getB2BLlcDetail for the document list.
    if (!authorized && doc.order_id) {
      const { data: assignment } = await adminSdk
        .from('b2b_order_assignments')
        .select('id')
        .eq('order_id', doc.order_id as string)
        .eq('b2b_user_id', user.id)
        .maybeSingle();
      authorized = !!assignment;
    }

    if (!authorized) {
      return NextResponse.json(
        { error: 'You are not authorized to view this document' },
        { status: 403 }
      );
    }

    // 5. Resolve the upstream URL — never expose it to the client
    const storageType = doc.storage_type as string | null;
    const publicId = doc.public_id as string | null;
    const storagePath = doc.storage_path as string | null;
    const mimeType = (doc.mime_type as string) || 'application/octet-stream';
    const fileName = (doc.file_name as string) || 'document';
    const isPdf = mimeType === 'application/pdf';

    let upstreamUrl: string | null = null;

    if (storageType === 'cloudinary' && publicId) {
      // Build a signed Cloudinary URL server-side only — never redirect to it.
      // The URL is used purely to fetch bytes here on the server.
      const resourceType: string = (doc.cloudinary_resource_type as string | null) || 'image';

      const urlOptions: Record<string, any> = {
        resource_type: resourceType,
        sign_url: true,
        secure: true,
        type: 'upload',
      };

      // Cloudinary raw PDFs need format=pdf to be served correctly when resource_type is image
      if (resourceType === 'image' && isPdf) {
        urlOptions.format = 'pdf';
      }

      upstreamUrl = cloudinary.url(publicId, urlOptions);
    } else {
      // Supabase Storage
      const signedSupabaseUrl = await getSignedSupabaseStorageUrl(storagePath, adminSdk);
      upstreamUrl = signedSupabaseUrl || (doc.url as string | null);
    }

    if (!upstreamUrl) {
      return NextResponse.json({ error: 'Document URL not available' }, { status: 500 });
    }

    // Proxy bytes through our server — the client sees only /api/documents/{id}/view
    const fileRes = await fetch(upstreamUrl, { cache: 'no-store' });
    if (!fileRes.ok) {
      return NextResponse.json(
        { error: `Upstream fetch failed: ${fileRes.status}` },
        { status: 502 }
      );
    }

    const bytes = await fileRes.arrayBuffer();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${fileName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
