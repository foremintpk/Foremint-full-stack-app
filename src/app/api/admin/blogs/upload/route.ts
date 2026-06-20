/**
 * POST /api/admin/blogs/upload
 * Uploads a blog image (featured image or in-editor image) directly to Cloudinary
 * and returns the secure URL. Only the Cloudinary URL is persisted in Supabase —
 * no image bytes are stored in Supabase Storage.
 *
 * Auth: administrator / manager only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { createClient } from '@/lib/supabase/server';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

async function assertBlogRole(): Promise<string | null> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', userId)
    .single();

  if (profile?.is_active !== true || (profile?.role !== 'administrator' && profile?.role !== 'manager')) {
    return null;
  }
  return userId;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await assertBlogRole();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image exceeds 10MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await new Promise<{ secure_url: string; public_id: string; width?: number; height?: number }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: 'foremint/blog',
              resource_type: 'image',
              tags: ['blog'],
            },
            (error, res) => {
              if (error || !res) return reject(error ?? new Error('Upload failed'));
              resolve({ secure_url: res.secure_url, public_id: res.public_id, width: res.width, height: res.height });
            }
          )
          .end(buffer);
      }
    );

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width ?? null,
      height: result.height ?? null,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
