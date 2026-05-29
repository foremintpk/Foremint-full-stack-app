/**
 * Trigger a browser download for a remote file URL (Cloudinary, Supabase public URL, etc.).
 */
export function triggerDocumentDownload(url: string, fileName: string): void {
  if (!url) return

  let downloadUrl = url

  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    downloadUrl = url.replace('/upload/', '/upload/fl_attachment/')
  }

  const link = document.createElement('a')
  link.href = downloadUrl
  link.setAttribute('download', fileName || 'document')
  link.setAttribute('target', '_blank')
  link.setAttribute('rel', 'noopener noreferrer')
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function isImageUrl(url: string, mimeType?: string | null): boolean {
  if (mimeType?.startsWith('image/')) return true
  return /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(url)
}
