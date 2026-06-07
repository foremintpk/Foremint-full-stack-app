export function isImageUrl(url: string, mimeType?: string | null): boolean {
  if (mimeType?.startsWith('image/')) return true
  return /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(url)
}
