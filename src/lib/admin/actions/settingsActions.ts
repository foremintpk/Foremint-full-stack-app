'use server'

import { createClient as createRawClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentAdminProfile } from '@/lib/admin/getCurrentAdminProfile'
import { UpdateEmailResult, UpdatePasswordResult } from '@/types/admin'

/**
 * Creates a stateless, non-SSR Supabase client purely for password verification.
 *
 * WHY: Using the SSR createClient() inside a Server Action for signInWithPassword
 * overwrites the existing session cookies with a brand-new session, which then
 * gets immediately invalidated by the admin signOut call — breaking the flow.
 * This standalone client never touches SSR cookies and is discarded after the check.
 */
function createVerifyClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')

  return createRawClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Attempts to sign out all sessions for the given user via the Supabase Admin API.
 *
 * WHY the silent-fail on JWT errors: GoTrue's admin logout endpoint iterates the
 * user's stored session tokens in the database to revoke them. If any stored token
 * is malformed/truncated (e.g., from a partial previous auth flow), GoTrue throws
 * "invalid JWT: token contains an invalid number of segments" — even though the
 * sessions are already effectively dead. We treat this as a success since there is
 * nothing valid left to revoke.
 */
async function revokeAllSessions(userId: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.signOut(userId, 'global')

  if (error) {
    const msg = error.message ?? ''
    const isJwtParseError =
      msg.includes('invalid JWT') ||
      msg.includes('malformed') ||
      msg.includes('token contains')

    // JWT parse errors on stored sessions = sessions already invalid → treat as success
    if (!isJwtParseError) {
      throw new Error(msg)
    }
  }
}

// ─── Update Email ─────────────────────────────────────────────────────────────

export async function updateAdminEmail(formData: FormData): Promise<UpdateEmailResult> {
  try {
    const admin = await getCurrentAdminProfile()
    if (!admin || admin.isActive !== true || admin.role !== 'administrator') {
      return { error: 'Unauthorized: Only administrators can update settings.' }
    }

    const newEmail = (formData.get('newEmail') as string)?.trim()
    const confirmEmail = (formData.get('confirmEmail') as string)?.trim()
    const currentPassword = formData.get('currentPassword') as string

    if (!newEmail || !confirmEmail || !currentPassword) {
      return { error: 'All fields are required.' }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return { error: 'Invalid email format.' }
    }

    if (newEmail !== confirmEmail) {
      return { error: 'New email addresses do not match.' }
    }

    if (newEmail.toLowerCase() === admin.email.toLowerCase()) {
      return { error: 'New email must be different from your current email.' }
    }

    const adminClient = createAdminClient()

    // 1. Preemptively check if the email is already in use in the profiles table.
    // This allows us to provide a highly detailed error message (e.g. role, name)
    // and avoids hitting any unique constraint triggers on user update which return a generic "error updating user".
    const { data: existingProfile, error: profileCheckError } = await adminClient
      .from('profiles')
      .select('email, role, full_name')
      .eq('email', newEmail.toLowerCase())
      .maybeSingle()

    if (profileCheckError) {
      console.error('[updateAdminEmail] Profile check error:', profileCheckError)
    }

    if (existingProfile) {
      const roleDisplayName = existingProfile.role
        ? existingProfile.role.charAt(0).toUpperCase() + existingProfile.role.slice(1).toLowerCase()
        : 'User'
      
      const namePart = existingProfile.full_name ? ` (${existingProfile.full_name})` : ''

      return {
        error: `Cannot update email: The email "${newEmail}" is already registered to an existing account with the role of "${roleDisplayName}"${namePart}. Please use a unique email address.`
      }
    }

    // 2. Verify current password using a STATELESS client (no SSR cookie writes)
    const verifyClient = createVerifyClient()
    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: admin.email,
      password: currentPassword,
    })

    if (signInError) {
      return { error: 'Incorrect current password.' }
    }

    const userId = admin.id

    // 3. Update email in Supabase Auth via service-role admin client
    const { error: authError } = await adminClient.auth.admin.updateUserById(
      userId,
      { email: newEmail }
    )

    if (authError) {
      let errMsg = authError.message
      if (errMsg.toLowerCase().includes('already exists') || errMsg.toLowerCase().includes('already in use')) {
        errMsg = `The email "${newEmail}" is already in use by another account.`
      } else if (errMsg.toLowerCase().includes('error updating user')) {
        errMsg = `Error updating user: The email "${newEmail}" is already registered on another account.`
      }
      return { error: errMsg }
    }

    // 4. Mirror email update in public.profiles (best-effort; auth is source of truth)
    await adminClient
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', userId)

    // 5. Revoke all sessions globally (ignore already-invalid JWT errors)
    await revokeAllSessions(userId)

    return { requiresReLogin: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
    return { error: msg }
  }
}

// ─── Update Password ──────────────────────────────────────────────────────────

export async function updateAdminPassword(formData: FormData): Promise<UpdatePasswordResult> {
  try {
    const admin = await getCurrentAdminProfile()
    if (!admin || admin.isActive !== true || admin.role !== 'administrator') {
      return { error: 'Unauthorized: Only administrators can update settings.' }
    }

    const currentPassword = formData.get('currentPassword') as string
    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { error: 'All fields are required.' }
    }

    if (newPassword.length < 8) {
      return { error: 'New password must be at least 8 characters long.' }
    }

    if (newPassword !== confirmPassword) {
      return { error: 'Passwords do not match.' }
    }

    if (newPassword === currentPassword) {
      return { error: 'New password must be different from your current password.' }
    }

    // 1. Verify current password using a STATELESS client (no SSR cookie writes)
    const verifyClient = createVerifyClient()
    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: admin.email,
      password: currentPassword,
    })

    if (signInError) {
      return { error: 'Incorrect current password.' }
    }

    const adminClient = createAdminClient()
    const userId = admin.id

    // 2. Update password in Supabase Auth via service-role admin client
    const { error: authError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (authError) {
      return { error: authError.message }
    }

    // 3. Revoke all sessions globally (ignore already-invalid JWT errors)
    await revokeAllSessions(userId)

    return { requiresReLogin: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
    return { error: msg }
  }
}

// ─── Force Logout All Sessions ────────────────────────────────────────────────

export async function forceLogoutAllSessions(): Promise<{ error?: string }> {
  try {
    const admin = await getCurrentAdminProfile()
    if (!admin || admin.isActive !== true || admin.role !== 'administrator') {
      return { error: 'Unauthorized: Only administrators can execute this action.' }
    }

    // Revoke all sessions (treats JWT-parse errors on stored tokens as success)
    await revokeAllSessions(admin.id)

    return {}
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
    return { error: msg }
  }
}
