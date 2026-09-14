/**
 * @file src/lib/services/ss4/guard.ts
 * @description Administrator gate for every SS-4 route and action.
 *
 * The EIN section is administrator-only, matching /admin/settings — managers do
 * not generate federal filings. This is deliberately a single helper rather
 * than the inline role checks used elsewhere in the codebase, so the boundary
 * for this feature is auditable in one place.
 */

import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface AdminIdentity {
  id: string;
}

export class Ss4ForbiddenError extends Error {
  constructor(message = 'Administrator role required.') {
    super(message);
    this.name = 'Ss4ForbiddenError';
  }
}

/**
 * Resolves the caller and confirms they are an active administrator.
 *
 * Throws rather than returning null: every caller here performs a privileged
 * action, so there is no path where an anonymous caller should continue.
 */
export async function requireSs4Admin(): Promise<AdminIdentity> {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new Ss4ForbiddenError('Not signed in.');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) throw new Ss4ForbiddenError('Profile not found.');

  const { role, is_active } = profile as { role: string; is_active: boolean | null };
  if (is_active !== true) throw new Ss4ForbiddenError('This account is disabled.');
  if (role !== 'administrator') throw new Ss4ForbiddenError();

  return { id: userId };
}

/**
 * Resolves the caller and confirms they may use a section shared with account
 * managers — currently the invoice generator.
 *
 * Separate from requireSs4Admin because that one is deliberately
 * administrator-only: SS-4 generation writes filed federal forms, and widening
 * it to keep one shared route happy would quietly widen that too.
 */
export async function requireInvoiceAccess(): Promise<AdminIdentity> {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new Ss4ForbiddenError('Not signed in.');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) throw new Ss4ForbiddenError('Profile not found.');

  const { role, is_active } = profile as { role: string; is_active: boolean | null };
  if (is_active !== true) throw new Ss4ForbiddenError('This account is disabled.');
  if (role !== 'administrator' && role !== 'account_manager') {
    throw new Ss4ForbiddenError('Administrator or account manager role required.');
  }

  return { id: userId };
}

/** True when the caller is an active administrator; never throws. */
export async function isSs4Admin(): Promise<boolean> {
  try {
    await requireSs4Admin();
    return true;
  } catch {
    return false;
  }
}
