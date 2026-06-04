'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface OrderTicket {
  id: string;
  subject: string;
  status: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface TicketMessage {
  id: string;
  queryId: string;
  senderId: string;
  senderName: string | null;
  senderRole: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export async function getOrderTickets(orderId: string): Promise<OrderTicket[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('queries')
      .select(`
        id, subject, status, user_id, created_at, updated_at,
        query_messages (id)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    return (data || []).map((q: any) => ({
      id: q.id,
      subject: q.subject,
      status: q.status,
      userId: q.user_id,
      createdAt: q.created_at,
      updatedAt: q.updated_at,
      messageCount: Array.isArray(q.query_messages) ? q.query_messages.length : 0,
    }));
  } catch {
    return [];
  }
}

export async function getTicketMessages(queryId: string): Promise<TicketMessage[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('query_messages')
      .select(`
        id, query_id, sender_id, content, is_internal, created_at,
        profiles!sender_id (full_name, role)
      `)
      .eq('query_id', queryId)
      .order('created_at', { ascending: true });

    return (data || []).map((m: any) => ({
      id: m.id,
      queryId: m.query_id,
      senderId: m.sender_id,
      senderName: m.profiles?.full_name ?? null,
      senderRole: m.profiles?.role ?? 'customer',
      content: m.content,
      isInternal: m.is_internal ?? false,
      createdAt: m.created_at,
    }));
  } catch {
    return [];
  }
}

export async function sendTicketMessage(
  queryId: string,
  content: string,
  isInternal = false
): Promise<{ success: boolean; message?: TicketMessage; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: role } = await supabase.rpc('get_my_role');
    if (role !== 'administrator' && role !== 'manager') {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await (supabase as any)
      .from('query_messages')
      .insert({
        query_id: queryId,
        sender_id: user.id,
        content,
        is_internal: isInternal,
      })
      .select(`id, query_id, sender_id, content, is_internal, created_at, profiles!sender_id (full_name, role)`)
      .single();

    if (error || !data) return { success: false, error: error?.message ?? 'Failed to send' };

    // Update query updated_at
    await (supabase as any)
      .from('queries')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', queryId);

    const d = data as any;
    return {
      success: true,
      message: {
        id: d.id,
        queryId: d.query_id,
        senderId: d.sender_id,
        senderName: d.profiles?.full_name ?? null,
        senderRole: d.profiles?.role ?? 'administrator',
        content: d.content,
        isInternal: d.is_internal ?? false,
        createdAt: d.created_at,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function updateTicketStatus(
  queryId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: role } = await supabase.rpc('get_my_role');
    if (role !== 'administrator' && role !== 'manager') return { success: false, error: 'Unauthorized' };

    const { error } = await (supabase as any)
      .from('queries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', queryId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}