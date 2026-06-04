'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { PaypalOrderStatus, PaypalOrderType } from '@/types/admin';

// Typecast cache revalidation methods for Next.js 16 compiler compatibility
const revalidatePathTyped = revalidatePath as unknown as (path: string, type?: 'layout' | 'page') => void;

async function verifyRole(allowedRoles: ('administrator' | 'manager')[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !allowedRoles.includes(profile.role as any)) {
    throw new Error('Unauthorized');
  }

  return { supabase, userId: user.id };
}

export async function createPaypalOrder(formData: FormData): Promise<{ error?: string }> {
  try {
    const { supabase, userId } = await verifyRole(['administrator', 'manager']);

    const customerName = formData.get('customerName') as string;
    const email = formData.get('email') as string;
    const date = formData.get('date') as string;
    const dealAmountStr = formData.get('dealAmount') as string;
    const type = formData.get('type') as PaypalOrderType;
    const status = formData.get('status') as PaypalOrderStatus;
    const notes = formData.get('notes') as string || null;

    if (!customerName || !email || !date || !dealAmountStr || !type || !status) {
      return { error: 'Required fields are missing' };
    }

    const dealAmount = Number(dealAmountStr);
    if (isNaN(dealAmount) || dealAmount < 0) {
      return { error: 'Deal amount must be a valid number >= 0' };
    }

    const { error: insertError } = await supabase.from('paypal_orders').insert({
      customer_name: customerName,
      email,
      date,
      deal_amount: dealAmount,
      type,
      status,
      notes,
      created_by: userId,
    });

    if (insertError) {
      return { error: insertError.message };
    }

    // Revalidate
    revalidateTag('paypal-orders', 'max');
    revalidatePathTyped('/admin/paypal-accounts', 'page');
    revalidatePathTyped('/admin', 'layout');

    return {};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { error: message };
  }
}

export async function updatePaypalOrder(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const { supabase } = await verifyRole(['administrator', 'manager']);

    const customerName = formData.get('customerName') as string;
    const email = formData.get('email') as string;
    const date = formData.get('date') as string;
    const dealAmountStr = formData.get('dealAmount') as string;
    const type = formData.get('type') as PaypalOrderType;
    const status = formData.get('status') as PaypalOrderStatus;
    const notes = formData.get('notes') as string || null;

    if (!customerName || !email || !date || !dealAmountStr || !type || !status) {
      return { error: 'Required fields are missing' };
    }

    const dealAmount = Number(dealAmountStr);
    if (isNaN(dealAmount) || dealAmount < 0) {
      return { error: 'Deal amount must be a valid number >= 0' };
    }

    const { error: updateError } = await supabase
      .from('paypal_orders')
      .update({
        customer_name: customerName,
        email,
        date,
        deal_amount: dealAmount,
        type,
        status,
        notes,
      })
      .eq('id', id);

    if (updateError) {
      return { error: updateError.message };
    }

    // Revalidate
    revalidateTag('paypal-orders', 'max');
    revalidatePathTyped('/admin/paypal-accounts', 'page');
    revalidatePathTyped('/admin', 'layout');

    return {};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { error: message };
  }
}

export async function deletePaypalOrder(id: string): Promise<{ error?: string }> {
  try {
    const { supabase } = await verifyRole(['administrator']);

    const { error: deleteError } = await supabase
      .from('paypal_orders')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return { error: deleteError.message };
    }

    // Revalidate
    revalidateTag('paypal-orders', 'max');
    revalidatePathTyped('/admin/paypal-accounts', 'page');
    revalidatePathTyped('/admin', 'layout');

    return {};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { error: message };
  }
}
