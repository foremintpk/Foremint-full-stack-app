import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { OnboardingMember } from '@/types/onboarding'

/** Derive a stable public_id when the client did not persist one (legacy uploads). */
export function derivePublicId(
  url: string,
  slotKey: string,
  existingPublicId?: string | null
): string {
  if (existingPublicId) return existingPublicId

  const cloudinaryMatch = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/i)
  if (cloudinaryMatch?.[1]) {
    return decodeURIComponent(cloudinaryMatch[1])
  }

  return `onboarding_${slotKey}_${Buffer.from(url).toString('base64url').slice(0, 32)}`
}

function inferStorageType(url: string): 'cloudinary' | 'supabase' {
  return url.includes('res.cloudinary.com') || url.includes('cloudinary.com')
    ? 'cloudinary'
    : 'supabase'
}

function inferMimeType(fileName: string): string | null {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  return null
}

export const PAYMENT_RECEIPT_SLOT_KEY = 'payment_receipt'

export interface SyncPaymentReceiptParams {
  profileId: string
  orderId: string
  receiptUrl: string
  receiptPublicId?: string | null
  receiptFileName?: string | null
}

export async function syncPaymentReceiptToDatabase(
  admin: SupabaseClient<Database>,
  {
    profileId,
    orderId,
    receiptUrl,
    receiptPublicId,
    receiptFileName,
  }: SyncPaymentReceiptParams
): Promise<void> {
  const url = receiptUrl.trim()
  if (!url) return

  const slotKey = PAYMENT_RECEIPT_SLOT_KEY
  const fileName = receiptFileName || 'payment-receipt'
  const publicId = derivePublicId(url, slotKey, receiptPublicId)

  await admin
    .from('documents')
    .update({ superseded_at: new Date().toISOString() })
    .eq('order_id', orderId)
    .eq('slot_key', slotKey)
    .is('superseded_at', null)

  const { error } = await admin.from('documents').insert({
    profile_id: profileId,
    order_id: orderId,
    document_type: 'payment_receipt',
    storage_type: inferStorageType(url),
    file_name: fileName,
    url,
    public_id: publicId,
    slot_key: slotKey,
    mime_type: inferMimeType(fileName),
    uploaded_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[syncPaymentReceipt] insert failed:', error)
  }
}

export interface SyncMemberDocumentsParams {
  profileId: string
  orderId: string | null
  members: Array<
    Pick<
      OnboardingMember,
      'documentUrl' | 'documentPublicId' | 'documentFileName' | 'slotKey'
    > & Partial<Pick<OnboardingMember, 'idDocuments'>>
  >
}

/**
 * Persist onboarding member identity documents to public.documents.
 * Called after account linking and again when an order is created.
 * Each member may carry multiple documents (idDocuments); legacy single
 * documentUrl members are handled as a one-item list.
 */
export async function syncMemberDocumentsToDatabase(
  admin: SupabaseClient<Database>,
  { profileId, orderId, members }: SyncMemberDocumentsParams
): Promise<void> {
  for (let index = 0; index < members.length; index++) {
    const member = members[index]
    const baseSlotKey = member.slotKey || `member_${index}_passport`

    const docs = (member.idDocuments?.length
      ? member.idDocuments
      : member.documentUrl
        ? [{
            url: member.documentUrl,
            publicId: member.documentPublicId ?? '',
            fileName: member.documentFileName ?? '',
            slotKey: baseSlotKey,
          }]
        : []
    ).filter(d => d.url?.trim())

    for (const doc of docs) {
      const url = doc.url.trim()
      const slotKey = doc.slotKey || baseSlotKey
      const fileName = doc.fileName || 'identity-document'
      const publicId = derivePublicId(url, slotKey, doc.publicId)

      if (orderId) {
        await admin
          .from('documents')
          .update({ superseded_at: new Date().toISOString() })
          .eq('order_id', orderId)
          .eq('slot_key', slotKey)
          .is('superseded_at', null)
      } else {
        await admin
          .from('documents')
          .update({ superseded_at: new Date().toISOString() })
          .eq('profile_id', profileId)
          .eq('slot_key', slotKey)
          .is('order_id', null)
          .is('superseded_at', null)
      }

      const { error } = await admin.from('documents').insert({
        profile_id: profileId,
        order_id: orderId,
        document_type: 'identity',
        storage_type: inferStorageType(url),
        file_name: fileName,
        url,
        public_id: publicId,
        slot_key: slotKey,
        mime_type: inferMimeType(fileName),
        uploaded_at: new Date().toISOString(),
      })

      if (error) {
        console.error(`[syncMemberDocuments] insert failed for ${slotKey}:`, error)
      }
    }
  }
}
