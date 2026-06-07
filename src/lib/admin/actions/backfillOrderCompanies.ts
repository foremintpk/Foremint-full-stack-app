'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type BackfillOrder = {
  id: string;
  user_id: string;
  order_number: string | null;
  form_snapshot: unknown;
};

type BackfillResult = {
  scanned: number;
  createdCompanies: number;
  linkedOrders: number;
  skipped: number;
  error?: string;
};

type AdminRole = 'administrator' | 'manager' | 'customer';

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getBusinessName(order: BackfillOrder): string {
  const snapshot = readObject(order.form_snapshot);
  const step3 = readObject(snapshot.step3);
  return (
    readString(step3.businessName) ??
    readString(snapshot.businessName) ??
    `LLC for order ${order.order_number ?? order.id.slice(0, 8)}`
  );
}

function getAddress(snapshot: Record<string, unknown>, key: string): Record<string, unknown> {
  const step3 = readObject(snapshot.step3);
  return readObject(step3[key]);
}

async function verifyAdministrator(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: 'Unauthenticated' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  const role = profile?.role as AdminRole | undefined;
  if (profileError || !profile || profile.is_active !== true || role !== 'administrator') {
    return { ok: false, error: 'Only administrators can backfill order companies.' };
  }

  return { ok: true };
}

export async function backfillOrderCompanies(limit = 100): Promise<BackfillResult> {
  const permission = await verifyAdministrator();
  if (!permission.ok) {
    return { scanned: 0, createdCompanies: 0, linkedOrders: 0, skipped: 0, error: permission.error };
  }

  const admin = createAdminClient();
  const safeLimit = Math.min(Math.max(limit, 1), 500);

  const { data: orders, error: ordersError } = await admin
    .from('orders')
    .select('id, user_id, order_number, form_snapshot')
    .is('company_id', null)
    .ilike('order_type', '%llc%')
    .order('created_at', { ascending: true })
    .limit(safeLimit);

  if (ordersError) {
    return {
      scanned: 0,
      createdCompanies: 0,
      linkedOrders: 0,
      skipped: 0,
      error: ordersError.message,
    };
  }

  let createdCompanies = 0;
  let linkedOrders = 0;
  let skipped = 0;
  const companyByOwner = new Map<string, string>();

  for (const order of (orders ?? []) as BackfillOrder[]) {
    let companyId = companyByOwner.get(order.user_id);

    if (!companyId) {
      const { data: existingCompany } = await admin
        .from('companies')
        .select('id')
        .eq('owner_id', order.user_id)
        .maybeSingle();

      companyId = typeof existingCompany?.id === 'string' ? existingCompany.id : undefined;
    }

    if (!companyId) {
      const snapshot = readObject(order.form_snapshot);
      const { data: newCompany, error: createError } = await admin
        .from('companies')
        .insert({
          owner_id: order.user_id,
          company_name: getBusinessName(order),
          business_address: getAddress(snapshot, 'businessAddress'),
          mailing_address: getAddress(snapshot, 'mailingAddress'),
        })
        .select('id')
        .single();

      if (createError || typeof newCompany?.id !== 'string') {
        skipped += 1;
        continue;
      }

      companyId = newCompany.id;
      createdCompanies += 1;
    }

    companyByOwner.set(order.user_id, companyId);

    const { error: updateError } = await admin
      .from('orders')
      .update({ company_id: companyId })
      .eq('id', order.id);

    if (updateError) {
      skipped += 1;
      continue;
    }

    linkedOrders += 1;
  }

  revalidateTag('order-list-llc', 'max');

  return {
    scanned: orders?.length ?? 0,
    createdCompanies,
    linkedOrders,
    skipped,
  };
}
