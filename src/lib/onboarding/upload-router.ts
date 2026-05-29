// Implements the hybrid routing rule:
// Files > 100KB or video/* → Cloudinary
// Files ≤ 100KB → Supabase Storage

const CLOUDINARY_THRESHOLD_BYTES = 100 * 1024; // 100KB

export type UploadTarget = 'cloudinary' | 'supabase';

export function resolveUploadTarget(file: File): UploadTarget {
  if (file.type.startsWith('video/')) return 'cloudinary';
  if (file.size > CLOUDINARY_THRESHOLD_BYTES) return 'cloudinary';
  return 'supabase';
}
