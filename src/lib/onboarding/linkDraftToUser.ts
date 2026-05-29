import { createClient as createAdminClient } from '@supabase/supabase-js'
import { mergeFormDataFromSteps } from './mergeFormData'
import { syncMemberDocumentsToDatabase } from './syncMemberDocuments'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function linkDraftToUser(
  tempSessionKey: string,
  userId: string
): Promise<void> {
  const admin = createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  await admin
    .from('onboarding_drafts')
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq('temp_session_key', tempSessionKey)

  const { data: draft } = await admin
    .from('onboarding_drafts')
    .select('form_data')
    .eq('temp_session_key', tempSessionKey)
    .single()

  if (!draft?.form_data) return

  const formDataByStep = draft.form_data as Record<number, unknown>
  const formData = mergeFormDataFromSteps(formDataByStep)

  await syncMemberDocumentsToDatabase(admin, {
    profileId: userId,
    orderId: null,
    members: formData.members ?? [],
  })
}
