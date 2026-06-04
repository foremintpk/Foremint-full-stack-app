'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';
import { revalidateOrder } from './revalidateOrder';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? 'Foremint <team@raobros.site>';

export type NotificationCategory = 'billing' | 'documents' | 'general' | 'addons';
export type NotificationStatus = 'active' | 'inactive';

export interface ClientNotification {
  id: string;
  orderId: string;
  category: NotificationCategory;
  title: string;
  body: string | null;
  status: NotificationStatus;
  sendEmail: boolean;
  emailSubject: string | null;
  emailBody: string | null;
  createdBy: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface CreateNotificationInput {
  orderId: string;
  adminId: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  status: NotificationStatus;
  sendEmail: boolean;
  emailSubject?: string;
  emailBody?: string;
  clientEmail?: string;
  clientName?: string;
}

function buildEmailHtml(subject: string, body: string, clientName: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family:Inter,sans-serif;background:#f9fafb;margin:0;padding:32px 0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.06);">
    <div style="background:#34088f;padding:28px 32px;">
      <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">Foremint</h1>
      <p style="color:#c4b5fd;font-size:12px;margin:4px 0 0;">LLC Formation Services</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:15px;color:#111;font-weight:700;margin:0 0 8px;">Hi ${clientName || 'there'},</p>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 24px;">${body.replace(/\n/g, '<br>')}</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard" style="display:inline-block;background:#34088f;color:#fff;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">
        View Dashboard →
      </a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f3f4f6;">
      <p style="font-size:11px;color:#9ca3af;margin:0;">© ${new Date().getFullYear()} Foremint · You're receiving this because you have an active LLC order.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function createClientNotification(
  input: CreateNotificationInput
): Promise<{ success: boolean; notification?: ClientNotification; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return { success: false, error: 'Unauthorized' };
    }

    const admin = createAdminClient();

    // 24-hour auto-expiry when active
    const expiresAt = input.status === 'active'
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await admin
      .from('order_client_notifications')
      .insert({
        order_id: input.orderId,
        category: input.category,
        title: input.title,
        body: input.body ?? null,
        status: input.status,
        send_email: input.sendEmail,
        email_subject: input.emailSubject ?? null,
        email_body: input.emailBody ?? null,
        created_by: input.adminId,
        expires_at: expiresAt,
      } as any)
      .select('*')
      .single();

    if (error || !data) return { success: false, error: error?.message ?? 'Insert failed' };

    // Push to client dashboard notifications table
    await admin.from('notifications').insert({
      type: 'order_update',
      recipient_id: null, // role-targeted
      target_role: null,
      title: input.title,
      body: input.body ?? null,
      link: `/dashboard/llc/${input.orderId}`,
      is_read: false,
    } as any);

    // Send email if requested
    if (input.sendEmail && input.clientEmail && input.emailSubject && input.emailBody) {
      if (process.env.RESEND_API_KEY) {
        resend.emails.send({
          from: FROM_ADDRESS,
          to: input.clientEmail,
          subject: input.emailSubject,
          html: buildEmailHtml(input.emailSubject, input.emailBody, input.clientName ?? ''),
        }).catch((err: any) => console.error('[createClientNotification email error]', err));
      }
    }

    await revalidateOrder(input.orderId);

    const d = data as any;
    return {
      success: true,
      notification: {
        id: d.id,
        orderId: d.order_id,
        category: d.category,
        title: d.title,
        body: d.body,
        status: d.status,
        sendEmail: d.send_email,
        emailSubject: d.email_subject,
        emailBody: d.email_body,
        createdBy: d.created_by,
        createdAt: d.created_at,
        expiresAt: d.expires_at,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Unexpected error' };
  }
}

export async function getOrderClientNotifications(orderId: string): Promise<ClientNotification[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('order_client_notifications')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    return (data || []).map((d: any) => ({
      id: d.id,
      orderId: d.order_id,
      category: d.category,
      title: d.title,
      body: d.body,
      status: d.status,
      sendEmail: d.send_email,
      emailSubject: d.email_subject,
      emailBody: d.email_body,
      createdBy: d.created_by,
      createdAt: d.created_at,
      expiresAt: d.expires_at,
    }));
  } catch {
    return [];
  }
}

export async function toggleClientNotificationStatus(
  notificationId: string,
  newStatus: NotificationStatus,
  orderId: string,
  clientEmail?: string,
  clientName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: role } = await supabase.rpc('get_my_role');
    if (role !== 'administrator' && role !== 'manager') return { success: false, error: 'Unauthorized' };

    const admin = createAdminClient();

    const expiresAt = newStatus === 'active'
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: notif, error: fetchErr } = await admin
      .from('order_client_notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (fetchErr || !notif) return { success: false, error: 'Notification not found' };

    const { error } = await admin
      .from('order_client_notifications')
      .update({ status: newStatus, expires_at: expiresAt } as any)
      .eq('id', notificationId);

    if (error) return { success: false, error: error.message };

    const n = notif as any;

    // Re-send email if being reactivated
    if (newStatus === 'active' && n.send_email && clientEmail && n.email_subject && n.email_body) {
      if (process.env.RESEND_API_KEY) {
        resend.emails.send({
          from: FROM_ADDRESS,
          to: clientEmail,
          subject: n.email_subject,
          html: buildEmailHtml(n.email_subject, n.email_body, clientName ?? ''),
        }).catch((err: any) => console.error('[toggleNotificationStatus email error]', err));
      }
    }

    await revalidateOrder(orderId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}