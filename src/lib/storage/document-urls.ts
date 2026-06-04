import { createAdminClient } from '@/lib/supabase/admin';

export type StorageDocumentLike = {
  storage_type?: string | null;
  storage_path?: string | null;
  url: string;
};

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

function parseStoragePath(storagePath?: string | null): { bucket: string; filePath: string } | null {
  if (!storagePath) return null;

  const slashIndex = storagePath.indexOf('/');
  if (slashIndex === -1) return null;

  const bucket = storagePath.slice(0, slashIndex);
  const filePath = storagePath.slice(slashIndex + 1);

  if (!bucket || !filePath) return null;

  return { bucket, filePath };
}

export async function getSignedSupabaseStorageUrl(
  storagePath?: string | null,
  adminClient: SupabaseAdminClient = createAdminClient(),
  expiresIn = 3600
): Promise<string | null> {
  const parsed = parseStoragePath(storagePath);
  if (!parsed) return null;

  const { data, error } = await adminClient.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.filePath, expiresIn);

  if (error || !data?.signedUrl) {
    console.error('[getSignedSupabaseStorageUrl] Failed to sign storage path:', {
      storagePath,
      bucket: parsed.bucket,
      filePath: parsed.filePath,
      error,
    });
    return null;
  }

  return data.signedUrl;
}

export async function hydrateSupabaseDocumentUrls<T extends StorageDocumentLike>(
  documents: T[],
  adminClient: SupabaseAdminClient = createAdminClient(),
  expiresIn = 3600
): Promise<T[]> {
  await Promise.allSettled(
    documents.map(async (doc) => {
      if (doc.storage_type !== 'supabase') return;

      const signedUrl = await getSignedSupabaseStorageUrl(doc.storage_path, adminClient, expiresIn);
      if (signedUrl) {
        doc.url = signedUrl;
      }
    })
  );

  return documents;
}