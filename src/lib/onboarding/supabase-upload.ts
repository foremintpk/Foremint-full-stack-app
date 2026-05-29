import { createClient } from '@/lib/supabase/server';

const BUCKET = 'onboarding-documents';

interface SupabaseUploadResult {
  publicUrl: string;
  path: string;
}

export async function uploadToSupabase(
  file: File,
  path: string
): Promise<SupabaseUploadResult> {
  const supabase = await createClient();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}
