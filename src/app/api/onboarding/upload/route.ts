import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const tempSessionKey = formData.get('temp_session_key') as string;
    const uploadType = formData.get('upload_type') as string;

    if (!file || !tempSessionKey || !UUID_REGEX.test(tempSessionKey)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (!['passport', 'payment_receipt'].includes(uploadType)) {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const memberIndex = formData.get('member_index') as string | null;
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${Date.now()}-${sanitizedName}`;
    const slotKey =
      uploadType === 'passport' && memberIndex !== null
        ? `member_${memberIndex}_passport`
        : `${uploadType}_${Date.now()}`;

    // Member identity docs always use Cloudinary for a stable public URL + public_id
    const useCloudinary =
      uploadType === 'passport' || uploadType === 'payment_receipt' || file.size > 100000;

    if (useCloudinary) {
      const uploadResult: { secure_url: string; public_id: string } = await new Promise(
        (resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              folder: `foremint/onboarding/${tempSessionKey}`,
              public_id: `${slotKey}_${Date.now()}`,
              resource_type: 'auto',
            },
            (error, result) => {
              if (error || !result) reject(error);
              else resolve({ secure_url: result.secure_url, public_id: result.public_id });
            }
          ).end(buffer);
        }
      );

      return NextResponse.json({
        success: true,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        fileName: file.name,
        slotKey,
        storage: 'cloudinary',
        file_size: file.size,
      });
    }

    const storagePath = `${tempSessionKey}/${uploadType}/${fileName}`;
    const { data, error } = await supabaseAdmin.storage
      .from('onboarding-documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('onboarding-documents')
      .getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      publicId: storagePath,
      fileName: file.name,
      slotKey,
      storage: 'supabase',
      file_size: file.size,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
