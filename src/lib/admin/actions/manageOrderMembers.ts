'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidateOrder } from './revalidateOrder';

export interface MemberInput {
  fullName: string;
  address: string;
  ssn?: string;
}

export async function addOrderMember(
  orderId: string,
  member: MemberInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return { success: false, error: 'Unauthorized' };
    }

    // Fetch current form_snapshot
    const { data: order, error: orderErr } = await (supabase as any)
      .from('orders')
      .select('form_snapshot')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) return { success: false, error: 'Order not found' };

    const snapshot = (order.form_snapshot as Record<string, any>) || {};
    const existingMembers: any[] = snapshot?.step4?.members ?? snapshot?.members ?? [];

    const newMember = {
      fullName: member.fullName,
      address: member.address,
      ssn: member.ssn ?? '',
      position: 'Member',
      slotKey: `member_${existingMembers.length}_passport`,
    };

    // Update the members array in form_snapshot
    const updatedSnapshot = {
      ...snapshot,
      members: [...existingMembers, newMember],
    };

    // If using step-based snapshot
    if (snapshot.step4) {
      updatedSnapshot.step4 = {
        ...(snapshot.step4 as Record<string, any>),
        members: [...existingMembers, newMember],
      };
      delete updatedSnapshot.members;
    }

    const { error: updateErr } = await (supabase as any)
      .from('orders')
      .update({ form_snapshot: updatedSnapshot, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updateErr) return { success: false, error: updateErr.message };

    await revalidateOrder(orderId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Unexpected error' };
  }
}

export async function deleteOrderMember(
  orderId: string,
  memberIndex: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: role } = await supabase.rpc('get_my_role');
    if (role !== 'administrator' && role !== 'manager') return { success: false, error: 'Unauthorized' };

    const { data: order, error: orderErr } = await (supabase as any)
      .from('orders')
      .select('form_snapshot')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) return { success: false, error: 'Order not found' };

    const snapshot = (order.form_snapshot as Record<string, any>) || {};
    const existingMembers: any[] = snapshot?.step4?.members ?? snapshot?.members ?? [];
    const updatedMembers = existingMembers.filter((_: any, i: number) => i !== memberIndex);

    const updatedSnapshot = { ...snapshot };
    if (snapshot.step4) {
      updatedSnapshot.step4 = { ...snapshot.step4, members: updatedMembers };
    } else {
      updatedSnapshot.members = updatedMembers;
    }

    const { error: updateErr } = await (supabase as any)
      .from('orders')
      .update({ form_snapshot: updatedSnapshot, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updateErr) return { success: false, error: updateErr.message };

    await revalidateOrder(orderId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}