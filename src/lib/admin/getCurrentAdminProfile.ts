import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AdminProfile, UserRole } from '@/types/admin'

export const getCurrentAdminProfile = cache(async (): Promise<AdminProfile | null> => {
  try {
    const supabase = await createClient()
    const { data: claimsData, error: authError } = await supabase.auth.getClaims()
    const user = claimsData?.claims
    if (authError || !user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone, role, avatar_url, is_active, created_at')
      .eq('id', user.sub)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      phone: data.phone,
      role: data.role as UserRole,
      avatarUrl: data.avatar_url,
      isActive: data.is_active,
      createdAt: data.created_at || null,
    }
  } catch {
    return null
  }
})
