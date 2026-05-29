'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidateTag, revalidatePath } from 'next/cache';

// Typecast cache revalidation methods for Next.js compiler compatibility
const revalidateTagTyped = revalidateTag as unknown as (tag: string) => void;
const revalidatePathTyped = revalidatePath as unknown as (path: string, type?: 'layout' | 'page') => void;

async function verifyRole(allowedRoles: ('administrator' | 'manager')[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || profile.is_active !== true || !allowedRoles.includes(profile.role as any)) {
    throw new Error('Unauthorized');
  }

  return { supabase, userId: user.id };
}

export async function createInvoice(formData: FormData): Promise<{ error?: string }> {
  try {
    const { supabase, userId } = await verifyRole(['administrator', 'manager']);

    const name = formData.get('name') as string;
    const date = formData.get('date') as string;
    const totalAmountPkrStr = formData.get('totalAmountPkr') as string;
    const commissionEarnedStr = formData.get('commissionEarned') as string;
    const notes = formData.get('notes') as string || null;

    if (!name || !date || !totalAmountPkrStr || !commissionEarnedStr) {
      return { error: 'Required fields are missing' };
    }

    const totalAmountPkr = Number(totalAmountPkrStr);
    const commissionEarned = Number(commissionEarnedStr);

    if (isNaN(totalAmountPkr) || totalAmountPkr < 0) {
      return { error: 'Total amount must be a valid number >= 0' };
    }
    if (isNaN(commissionEarned) || commissionEarned < 0) {
      return { error: 'Commission earned must be a valid number >= 0' };
    }

    // Do NOT pass invoice_number, let default sequence generate it
    const { error: insertError } = await supabase.from('invoices').insert({
      name,
      date,
      total_amount_pkr: totalAmountPkr,
      commission_earned: commissionEarned,
      notes,
      created_by: userId,
    });

    if (insertError) {
      console.error('Error creating invoice:', insertError);
      return { error: insertError.message };
    }

    // Revalidate cache
    revalidateTagTyped('invoice-list');
    revalidatePathTyped('/admin/invoices', 'page');
    revalidatePathTyped('/admin', 'layout');

    return {};
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function updateInvoice(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const { supabase } = await verifyRole(['administrator', 'manager']);

    const name = formData.get('name') as string;
    const date = formData.get('date') as string;
    const totalAmountPkrStr = formData.get('totalAmountPkr') as string;
    const commissionEarnedStr = formData.get('commissionEarned') as string;
    const notes = formData.get('notes') as string || null;

    if (!name || !date || !totalAmountPkrStr || !commissionEarnedStr) {
      return { error: 'Required fields are missing' };
    }

    const totalAmountPkr = Number(totalAmountPkrStr);
    const commissionEarned = Number(commissionEarnedStr);

    if (isNaN(totalAmountPkr) || totalAmountPkr < 0) {
      return { error: 'Total amount must be a valid number >= 0' };
    }
    if (isNaN(commissionEarned) || commissionEarned < 0) {
      return { error: 'Commission earned must be a valid number >= 0' };
    }

    // Update fields except invoice_number
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        name,
        date,
        total_amount_pkr: totalAmountPkr,
        commission_earned: commissionEarned,
        notes,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating invoice:', updateError);
      return { error: updateError.message };
    }

    // Revalidate cache
    revalidateTagTyped('invoice-list');
    revalidatePathTyped('/admin/invoices', 'page');
    revalidatePathTyped('/admin', 'layout');

    return {};
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function deleteInvoice(id: string): Promise<{ error?: string }> {
  try {
    // Only administrator can delete
    const { supabase } = await verifyRole(['administrator']);

    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting invoice:', deleteError);
      return { error: deleteError.message };
    }

    // Revalidate cache
    revalidateTagTyped('invoice-list');
    revalidatePathTyped('/admin/invoices', 'page');
    revalidatePathTyped('/admin', 'layout');

    return {};
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' };
  }
}
