/**
 * Trigger a browser download for a remote file URL (Cloudinary, Supabase public URL, etc.).
 */
export async function triggerDocumentDownload(url: string, fileName: string): Promise<void> {
  if (!url) return;

  const downloadUrl = url.includes('res.cloudinary.com') && url.includes('/upload/')
    ? url.replace('/upload/', '/upload/fl_attachment/')
    : url;

  try {
    const response = await fetch(downloadUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Download request failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName || 'document';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return;
  } catch (error) {
    console.error('[triggerDocumentDownload] Falling back to direct link download:', error);
  }

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', fileName || 'document');
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function isImageUrl(url: string, mimeType?: string | null): boolean {
  if (mimeType?.startsWith('image/')) return true
  return /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(url)
}
