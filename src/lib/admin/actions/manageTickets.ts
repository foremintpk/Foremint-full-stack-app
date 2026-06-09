'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendAdminReplyCustomerEmail } from '@/lib/email/sendTicketEmails';

export interface OrderTicket {
  id: string;
  subject: string;
  status: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface AdminTicket {
  id: string;
  subject: string;
  status: string;
  userId: string;
  customerName: string | null;
  customerEmail: string | null;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: string | null;
}

type RawRow = Record<string, unknown>;

/** All support tickets across all customers, newest activity first. */
export async function getAllTickets(): Promise<AdminTicket[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('queries')
      .select(`
        id, subject, status, user_id, order_id, created_at, updated_at,
        profiles!user_id (full_name, email),
        query_messages (id, content, created_at)
      `)
      .order('updated_at', { ascending: false });

    return (data as RawRow[] || []).map((q) => {
      const msgs = Array.isArray(q.query_messages) ? (q.query_messages as RawRow[]) : [];
      const lastMsg = msgs
        .slice()
        .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())[0];
      const profile = q.profiles as RawRow | null;
      return {
        id: q.id as string,
        subject: q.subject as string,
        status: q.status as string,
        userId: q.user_id as string,
        customerName: (profile?.full_name as string | null) ?? null,
        customerEmail: (profile?.email as string | null) ?? null,
        orderId: (q.order_id as string | null) ?? null,
        createdAt: q.created_at as string,
        updatedAt: q.updated_at as string,
        messageCount: msgs.length,
        lastMessage: (lastMsg?.content as string | null) ?? null,
      };
    });
  } catch {
    return [];
  }
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

    return (data as RawRow[] || []).map((q) => ({
      id: q.id as string,
      subject: q.subject as string,
      status: q.status as string,
      userId: q.user_id as string,
      createdAt: q.created_at as string,
      updatedAt: q.updated_at as string,
      messageCount: Array.isArray(q.query_messages) ? (q.query_messages as RawRow[]).length : 0,
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

    return (data as RawRow[] || []).map((m) => {
      const profile = m.profiles as RawRow | null;
      return {
        id: m.id as string,
        queryId: m.query_id as string,
        senderId: m.sender_id as string,
        senderName: (profile?.full_name as string | null) ?? null,
        senderRole: (profile?.role as string | null) ?? 'customer',
        content: m.content as string,
        isInternal: (m.is_internal as boolean | null) ?? false,
        createdAt: m.created_at as string,
      };
    });
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
    const { data: claimsData } = await supabase.auth.getClaims();
    const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: role } = await supabase.rpc('get_my_role');
    if (role !== 'administrator' && role !== 'manager') {
      return { success: false, error: 'Unauthorized' };
    }

    const admin = createAdminClient();
    const { data, error } = await admin
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

    // Update SLA timestamps + updated_at (only non-internal messages count for SLA)
    const now = new Date().toISOString();
    if (!isInternal) {
      const { data: ticketSla } = await admin
        .from('queries')
        .select('first_admin_response_at')
        .eq('id', queryId)
        .maybeSingle();

      await admin.from('queries').update({
        updated_at: now,
        last_admin_reply_at: now,
        ...(ticketSla && !ticketSla.first_admin_response_at ? { first_admin_response_at: now } : {}),
      }).eq('id', queryId);
    } else {
      await admin.from('queries').update({ updated_at: now }).eq('id', queryId);
    }

    const d = data as RawRow;
    const senderProfile = d.profiles as RawRow | null;

    // Email the customer about the admin reply (non-internal only, fire-and-forget)
    if (!isInternal) {
      void (async () => {
        try {
          const { data: ticket } = await admin
            .from('queries')
            .select(`subject, profiles!user_id (full_name, email)`)
            .eq('id', queryId)
            .maybeSingle();
          if (ticket) {
            const t = ticket as RawRow;
            const customerProfile = t.profiles as RawRow | null;
            const customerEmail = customerProfile?.email as string | null;
            if (customerEmail) {
              await sendAdminReplyCustomerEmail({
                customerEmail,
                customerName: (customerProfile?.full_name as string | null) || 'Customer',
                subject: (t.subject as string | null) ?? '',
                replyContent: content,
                ticketId: queryId,
              });
            }
          }
        } catch { /* non-fatal */ }
      })();
    }

    return {
      success: true,
      message: {
        id: d.id as string,
        queryId: d.query_id as string,
        senderId: d.sender_id as string,
        senderName: (senderProfile?.full_name as string | null) ?? null,
        senderRole: (senderProfile?.role as string | null) ?? 'administrator',
        content: d.content as string,
        isInternal: (d.is_internal as boolean | null) ?? false,
        createdAt: d.created_at as string,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
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

    const admin = createAdminClient();
    const { error } = await admin
      .from('queries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', queryId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Permanently delete a ticket and all its messages (admin/manager only). */
export async function deleteTicket(queryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: role } = await supabase.rpc('get_my_role');
    if (role !== 'administrator' && role !== 'manager') return { success: false, error: 'Unauthorized' };

    const admin = createAdminClient();
    // query_messages cascade-delete via FK ON DELETE CASCADE
    const { error } = await admin.from('queries').delete().eq('id', queryId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
