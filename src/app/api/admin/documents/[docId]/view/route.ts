import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSignedSupabaseStorageUrl } from '@/lib/storage/document-urls';
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

    // Auth: admin or manager only
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch document record - select cloudinary_resource_type if the column exists.
    // Fall back gracefully if it has not been migrated yet.
    const { data: doc, error: docError } = await (supabase as any)
      .from('documents')
      .select('url, mime_type, file_name, public_id, storage_type, cloudinary_resource_type, storage_path')
      .eq('id', docId)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const storageType = doc.storage_type as string | null;
    const publicId = doc.public_id as string | null;
    const storagePath = doc.storage_path as string | null;
    const mimeType = (doc.mime_type as string) || 'application/octet-stream';
    const fileName = (doc.file_name as string) || 'document';
    const isPdf = mimeType === 'application/pdf';

    if (storageType === 'cloudinary' && publicId) {
      // Determine the Cloudinary resource_type this asset was stored under.
      // New uploads store the value in cloudinary_resource_type ('raw' or 'image').
      // Old uploads used resource_type:'auto', which Cloudinary resolves to 'image'.
      // Default to 'image' - never default to 'raw' for unknown docs.
      const resourceType: string =
        (doc.cloudinary_resource_type as string | null) || 'image';

      const urlOptions: Record<string, any> = {
        resource_type: resourceType,
        sign_url: true,
        secure: true,
        type: 'upload',
      };

      if (resourceType === 'image' && isPdf) {
        urlOptions.format = 'pdf';
      }

      if (isDownload) {
        urlOptions.flags = 'attachment';
      }

      const signedUrl = cloudinary.url(publicId, urlOptions);
      return NextResponse.redirect(signedUrl, { status: 302 });
    }

    // Supabase Storage path - proxy bytes with the correct Content-Type.
    const signedSupabaseUrl = await getSignedSupabaseStorageUrl(storagePath, adminSdk);
    const upstreamUrl = signedSupabaseUrl || (doc.url as string | null);

    if (!upstreamUrl) {
      return NextResponse.json({ error: 'Document URL not available' }, { status: 500 });
    }

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
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}