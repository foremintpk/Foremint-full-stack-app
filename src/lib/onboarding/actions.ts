'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { step1Schema, step2Schema, step3Schema } from './schemas';
import type { Step1Data, Step2Data, Step3Data } from './schemas';
import { revalidatePath } from 'next/cache';

// ─── Step 1 ────────────────────────────────────────────────────────────────
export async function saveStep1(data: Step1Data) {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  const user = claimsData?.claims;

  if (authError || !user) redirect('/onboarding');

  const parsed = step1Schema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { error } = await ((supabase
    .from('profiles') as any)
    .update({
      ...parsed.data,
      onboarding_step: 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.sub));

  if (error) return { error: { _server: [error.message] } };
  
  revalidatePath('/onboarding', 'layout');
  return { success: true };
}

// ─── Step 2 ────────────────────────────────────────────────────────────────
export async function saveStep2(data: Step2Data) {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  const user = claimsData?.claims;

  if (authError || !user) redirect('/onboarding');

  const parsed = step2Schema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { error } = await ((supabase
    .from('profiles') as any)
    .update({
      ...parsed.data,
      onboarding_step: 2,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.sub));

  if (error) return { error: { _server: [error.message] } };
  
  revalidatePath('/onboarding', 'layout');
  return { success: true };
}

// ─── Step 3 ────────────────────────────────────────────────────────────────
export async function saveStep3(data: Step3Data) {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  const user = claimsData?.claims;

  if (authError || !user) redirect('/onboarding');

  const parsed = step3Schema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // Step 3 does NOT set onboarding_completed — that happens in 3B after file upload
  const { error } = await ((supabase
    .from('profiles') as any)
    .update({
      ...parsed.data,
      onboarding_step: 3,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.sub));

  if (error) return { error: { _server: [error.message] } };
  
  revalidatePath('/onboarding', 'layout');
  return { success: true };
}
