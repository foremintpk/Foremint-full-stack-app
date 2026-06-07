'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createRawClient } from '@supabase/supabase-js';
import { revalidateTag as nextRevalidateTag } from 'next/cache';
const revalidateTag = nextRevalidateTag as any;
import { getSession } from '@/lib/auth/get-session';
import { sendAdminReceiptUploadedEmail } from '@/lib/email/sendOrderConfirmation';
import type { UpdateEmailResult, UpdatePasswordResult } from '@/types/admin';

// Helper stateless verify client (no SSR cookies written)
function createVerifyClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');

  return createRawClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Helper to revoke all active user sessions globally
async function revokeAllSessions(userId: string): Promise<void> {
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.signOut(userId, 'global');

  if (error) {
    const msg = error.message ?? '';
    const isJwtParseError =
      msg.includes('invalid JWT') ||
      msg.includes('malformed') ||
      msg.includes('token contains');

    if (!isJwtParseError) {
      throw new Error(msg);
    }
  }
}

// Helper: infer mime type
function inferMimeType(fileName: string): string | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}

// ─── Profile Update ───────────────────────────────────────────────────────────
export async function updateCustomerProfile(
  userId: string,
  fullName: string,
  phone: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (session.user.id !== userId) {
      return { success: false, error: 'Unauthorized profile update' };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateTag(`customer-dashboard-${userId}`, 'max');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unexpected error' };
  }
}

// ─── Update Email ─────────────────────────────────────────────────────────────
export async function updateCustomerEmail(
  formData: FormData
): Promise<UpdateEmailResult> {
  try {
    const session = await getSession();
    const userId = session.user.id;
    const currentEmail = session.profile.email;

    const newEmail = (formData.get('newEmail') as string)?.trim();
    const confirmEmail = (formData.get('confirmEmail') as string)?.trim();
    const currentPassword = formData.get('currentPassword') as string;

    if (!newEmail || !confirmEmail || !currentPassword) {
      return { error: 'All fields are required.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return { error: 'Invalid email format.' };
    }

    if (newEmail !== confirmEmail) {
      return { error: 'New email addresses do not match.' };
    }

    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      return { error: 'New email must be different from current email.' };
    }

    const adminClient = createAdminClient();

    // Check profile conflict
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('email')
      .eq('email', newEmail.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      return { error: `The email "${newEmail}" is already registered on another account.` };
    }

    // Verify current password statelessly
    const verifyClient = createVerifyClient();
    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: currentEmail,
      password: currentPassword,
    });

    if (signInError) {
      return { error: 'Incorrect current password.' };
    }

    // Update Auth Email
    const { error: authError } = await adminClient.auth.admin.updateUserById(
      userId,
      { email: newEmail }
    );

    if (authError) {
      return { error: authError.message };
    }

    // Update Profile Email
    await adminClient
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', userId);

    // Global session signout
    await revokeAllSessions(userId);

    return { requiresReLogin: true };
  } catch (err: any) {
    return { error: err.message || 'Unexpected server error.' };
  }
}

// ─── Update Password ──────────────────────────────────────────────────────────
export async function updateCustomerPassword(
  formData: FormData
): Promise<UpdatePasswordResult> {
  try {
    const session = await getSession();
    const userId = session.user.id;
    const currentEmail = session.profile.email;

    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { error: 'All fields are required.' };
    }

    if (newPassword.length < 8) {
      return { error: 'New password must be at least 8 characters long.' };
    }

    if (newPassword !== confirmPassword) {
      return { error: 'Passwords do not match.' };
    }

    if (newPassword === currentPassword) {
      return { error: 'New password must be different from current password.' };
    }

    // Verify current password statelessly
    const verifyClient = createVerifyClient();
    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: currentEmail,
      password: currentPassword,
    });

    if (signInError) {
      return { error: 'Incorrect current password.' };
    }

    const adminClient = createAdminClient();
    const { error: authError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (authError) {
      return { error: authError.message };
    }

    // Revoke sessions
    await revokeAllSessions(userId);

    return { requiresReLogin: true };
  } catch (err: any) {
    return { error: err.message || 'Unexpected server error.' };
  }
}

// ─── Document Proof Submission ───────────────────────────────────────────────
export async function submitDocumentProof(
  orderId: string,
  slotKey: string,
  documentUrl: string,
  fileName: string,
  fileSize?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    const userId = session.user.id;
    const supabase = await createClient();

    // Verify ownership of the order
    const { data: order, error: orderCheckErr } = await supabase
      .from('orders')
      .select('id, user_id, order_number')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (orderCheckErr || !order) {
      return { success: false, error: 'Unauthorized or invalid order reference.' };
    }

    // 1. Supersede any existing documents in this slot
    await supabase
      .from('documents')
      .update({ superseded_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .eq('slot_key', slotKey)
      .is('superseded_at', null);

    // 2. Insert the new document
    const { error: docInsertErr } = await supabase.from('documents').insert({
      profile_id: userId,
      order_id: orderId,
      document_type: slotKey.includes('receipt') ? 'payment_receipt' : 'identity',
      storage_type: 'cloudinary',
      file_name: fileName,
      url: documentUrl,
      slot_key: slotKey,
      file_size: fileSize || null,
      mime_type: inferMimeType(fileName),
      uploaded_at: new Date().toISOString(),
    } as any);

    if (docInsertErr) {
      return { success: false, error: 'Failed to log document details: ' + docInsertErr.message };
    }

    // 3. Update pending resubmission request if one exists
    await supabase
      .from('document_resubmission_requests')
      .update({
        status: 'resubmitted',
        resolved_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('field_name', slotKey)
      .eq('status', 'pending');

    // 4. Send admin notification
    const clientName = session.profile.full_name || session.profile.email;
    await supabase.from('notifications').insert({
      type: 'document_resubmitted',
      target_role: 'administrator',
      title: 'Resubmitted Document',
      body: `Customer ${clientName} uploaded a new document for slot "${slotKey}" on order #${order.order_number || order.id.slice(0, 8)}`,
      link: `/admin/llc-registrations/${orderId}`,
      is_read: false,
    });

    // 5. Invalidate caches
    revalidateTag(`order-${orderId}`, 'max');
    revalidateTag(`llc-detail-${orderId}`, 'max');
    revalidateTag(`customer-dashboard-${userId}`, 'max');
    revalidateTag('notif-list-admin', 'max');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unexpected exception occurred' };
  }
}

// ─── Bank Receipt Proof Submission ────────────────────────────────────────────
export async function submitBankTransferReceipt(
  orderId: string,
  receiptUrl: string,
  fileName: string,
  fileSize?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    const userId = session.user.id;
    const supabase = await createClient();

    // Verify order
    const { data: order, error: orderCheckErr } = await supabase
      .from('orders')
      .select('id, user_id, order_number, form_snapshot, formation_state_name, formation_state, grand_total')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (orderCheckErr || !order) {
      return { success: false, error: 'Unauthorized or invalid order' };
    }

    // 1. Supersede any receipt documents
    await supabase
      .from('documents')
      .update({ superseded_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .eq('slot_key', 'payment_receipt')
      .is('superseded_at', null);

    // 2. Insert receipt document
    const { error: docErr } = await supabase.from('documents').insert({
      profile_id: userId,
      order_id: orderId,
      document_type: 'invoice',
      storage_type: 'cloudinary',
      file_name: fileName,
      url: receiptUrl,
      slot_key: 'payment_receipt',
      file_size: fileSize || null,
      mime_type: inferMimeType(fileName),
      uploaded_at: new Date().toISOString(),
    } as any);

    if (docErr) {
      return { success: false, error: docErr.message };
    }

    // 3. Update order payment status
    const { error: orderUpdateErr } = await supabase
      .from('orders')
      .update({
        payment_status: 'partial',
        payment_receipt_url: receiptUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (orderUpdateErr) {
      return { success: false, error: orderUpdateErr.message };
    }

    // 4. Send admin notification (in-app)
    const clientName = session.profile.full_name || session.profile.email;
    const snapshot = (order as any).form_snapshot || {};
    const businessName =
      snapshot?.step3?.businessName ||
      snapshot?.businessName ||
      `Order ${order.order_number || order.id.slice(0, 8)}`;

    await supabase.from('notifications').insert({
      type: 'receipt_uploaded',
      target_role: 'administrator',
      title: 'Payment Proof Uploaded',
      body: `${clientName} uploaded a bank transfer receipt for ${businessName} (#${order.order_number || order.id.slice(0, 8)})`,
      link: `/admin/llc-registrations/${orderId}`,
      is_read: false,
    });

    // 4b. Email the admin (fire-and-forget — never blocks the upload)
    sendAdminReceiptUploadedEmail({
      customerName: clientName,
      customerEmail: session.profile.email,
      businessName,
      orderId,
      orderNumber: order.order_number || order.id.slice(0, 8),
      formationState: (order as any).formation_state_name || (order as any).formation_state || undefined,
      pendingAmount: Number((order as any).grand_total || 0) || undefined,
    }).catch((err) => console.error('[submitBankTransferReceipt email error]', err));

    // 5. Invalidate caches
    revalidateTag(`order-${orderId}`, 'max');
    revalidateTag(`llc-detail-${orderId}`, 'max');
    revalidateTag(`customer-dashboard-${userId}`, 'max');
    revalidateTag('notif-list-admin', 'max');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected exception' };
  }
}

// ─── Simulated Card Payment ──────────────────────────────────────────────────
export async function simulateStripePayment(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    const userId = session.user.id;
    const supabase = await createClient();

    // Verify order
    const { data: order, error: orderCheckErr } = await supabase
      .from('orders')
      .select('id, user_id, status, grand_total, order_number')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (orderCheckErr || !order) {
      return { success: false, error: 'Unauthorized or invalid order' };
    }

    // 1. Update payment status to paid only — order status is admin-controlled
    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // 3. Send admin notification
    const clientName = session.profile.full_name || session.profile.email;
    await supabase.from('notifications').insert({
      type: 'order_payment_received',
      target_role: 'administrator',
      title: 'Payment Received',
      body: `Card payment received for LLC order #${order.order_number || order.id.slice(0, 8)} by client ${clientName} ($${order.grand_total})`,
      link: `/admin/llc-registrations/${orderId}`,
      is_read: false,
    });

    // 4. Invalidate caches
    revalidateTag(`order-${orderId}`, 'max');
    revalidateTag(`llc-detail-${orderId}`, 'max');
    revalidateTag(`customer-dashboard-${userId}`, 'max');
    revalidateTag('notif-list-admin', 'max');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected exception' };
  }
}

// ─── Mark Customer Notifications Read ─────────────────────────────────────────
export async function markCustomerNotificationsRead(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (session.user.id !== userId) {
      return { success: false, error: 'Unauthorized notifications update' };
    }

    const supabase = await createClient();

    // Mark recipient_id read
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    revalidateTag(`customer-dashboard-${userId}`, 'max');
    revalidateTag(`notif-list-${userId}`, 'max');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected error' };
  }
}

// ─── Support Tickets ──────────────────────────────────────────────────────────
export async function createSupportQuery(
  userId: string,
  subject: string,
  message: string
): Promise<{ success: boolean; queryId?: string; error?: string }> {
  try {
    const session = await getSession();
    if (session.user.id !== userId) {
      return { success: false, error: 'Unauthorized ticket creation' };
    }

    if (!subject.trim() || !message.trim()) {
      return { success: false, error: 'Subject and message are required' };
    }

    const supabase = await createClient();

    // 1. Insert ticket query
    const { data: query, error: queryErr } = await supabase
      .from('queries')
      .insert({
        user_id: userId,
        subject: subject.trim(),
        status: 'open',
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (queryErr || !query) {
      return { success: false, error: 'Failed to create ticket: ' + queryErr.message };
    }

    // 2. Insert message
    const { error: msgErr } = await supabase.from('query_messages').insert({
      query_id: query.id,
      sender_id: userId,
      content: message.trim(),
      is_internal: false,
      created_at: new Date().toISOString(),
    });

    if (msgErr) {
      return { success: false, error: 'Failed to post message: ' + msgErr.message };
    }

    // 3. Notify administrator
    const clientName = session.profile.full_name || session.profile.email;
    await supabase.from('notifications').insert({
      type: 'new_support_ticket',
      target_role: 'administrator',
      title: 'New Support Ticket',
      body: `Customer ${clientName} created support ticket: "${subject}"`,
      link: `/admin/queries`, // assuming admin queries route
      is_read: false,
    });

    revalidateTag(`customer-dashboard-${userId}`, 'max');
    return { success: true, queryId: query.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected exception' };
  }
}

export async function sendSupportMessage(
  queryId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    const userId = session.user.id;

    if (!content.trim()) {
      return { success: false, error: 'Message content cannot be empty' };
    }

    const supabase = await createClient();

    // Verify ticket ownership
    const { data: ticket, error: ticketCheckErr } = await supabase
      .from('queries')
      .select('id, user_id')
      .eq('id', queryId)
      .single();

    if (ticketCheckErr || !ticket || ticket.user_id !== userId) {
      return { success: false, error: 'Unauthorized ticket reference' };
    }

    // 1. Insert message
    const { error: msgErr } = await supabase.from('query_messages').insert({
      query_id: queryId,
      sender_id: userId,
      content: content.trim(),
      is_internal: false,
      created_at: new Date().toISOString(),
    });

    if (msgErr) {
      return { success: false, error: msgErr.message };
    }

    // 2. Update query updated_at timestamp
    await supabase
      .from('queries')
      .update({
        status: 'open', // Reopen query if resolved/closed and customer responds
        updated_at: new Date().toISOString(),
      })
      .eq('id', queryId);

    // 3. Notify admin
    const clientName = session.profile.full_name || session.profile.email;
    await supabase.from('notifications').insert({
      type: 'new_support_message',
      target_role: 'administrator',
      title: 'New Support Message',
      body: `Customer ${clientName} sent a reply on ticket #${queryId.slice(0, 8)}`,
      link: `/admin/queries`,
      is_read: false,
    });

    revalidateTag(`customer-dashboard-${userId}`, 'max');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected exception' };
  }
}
