import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// SLA thresholds (milliseconds)
const SLA_LEVEL1_MS = 2  * 60 * 60 * 1000; // 2 h  — no first admin response
const SLA_LEVEL2_MS = 24 * 60 * 60 * 1000; // 24 h — unresolved
const SLA_LEVEL3_MS = 72 * 60 * 60 * 1000; // 72 h — unresolved

function getAdminSdk() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service-role credentials');
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

/** Verify the Vercel cron secret so this route cannot be triggered by strangers. */
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // deny if not configured
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sdk = getAdminSdk();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const now = new Date();

  // ── Fetch all open/in_progress tickets ────────────────────────────────────
  const { data: tickets, error } = await sdk
    .from('queries')
    .select(`
      id, subject, status, created_at, user_id, escalation_level,
      first_admin_response_at, last_customer_reply_at, last_admin_reply_at,
      assigned_admin_id,
      profiles!user_id (full_name, email)
    `)
    .in('status', ['open', 'in_progress']);

  if (error) {
    console.error('[ticket-escalations] fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Fetch all admins for escalation notifications ─────────────────────────
  const { data: admins } = await sdk
    .from('profiles')
    .select('id, full_name, email')
    .in('role', ['administrator', 'manager'])
    .eq('is_active', true);

  type AdminRow = { id: string; full_name: string | null; email: string | null };
  const adminRows = (admins || []) as AdminRow[];
  const adminEmails = adminRows.map((a) => a.email).filter(Boolean) as string[];
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'Foremint <team@raobros.site>';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://foremint.pk';

  let escalated = 0;
  const errors: string[] = [];

  for (const ticket of tickets ?? []) {
    const createdMs = new Date(ticket.created_at as string).getTime();
    const ageMs = now.getTime() - createdMs;
    const currentLevel: number = (ticket.escalation_level as number) ?? 0;

    // Determine new escalation level
    let newLevel = currentLevel;

    if (currentLevel < 3 && ageMs >= SLA_LEVEL3_MS) {
      newLevel = 3;
    } else if (currentLevel < 2 && ageMs >= SLA_LEVEL2_MS) {
      newLevel = 2;
    } else if (currentLevel < 1 && !(ticket.first_admin_response_at) && ageMs >= SLA_LEVEL1_MS) {
      // Level 1 only triggers if there's still no first admin response
      newLevel = 1;
    }

    if (newLevel <= currentLevel) continue; // nothing to escalate

    // Insert escalation record (UNIQUE constraint prevents duplicates)
    const { error: escErr } = await sdk.from('ticket_escalations').upsert(
      {
        query_id: ticket.id,
        level: newLevel,
        triggered_at: now.toISOString(),
        reason: `SLA breach: ticket age ${Math.round(ageMs / 3600000)}h, level ${newLevel}`,
        notified_admins: adminRows.map((a) => a.id),
      },
      { onConflict: 'query_id,level', ignoreDuplicates: true }
    );

    if (escErr) {
      errors.push(`ticket ${ticket.id}: ${escErr.message}`);
      continue;
    }

    // Update escalation_level + sla_breached_at on the ticket
    await sdk.from('queries').update({
      escalation_level: newLevel,
      sla_breached_at: now.toISOString(),
    }).eq('id', ticket.id);

    // Send escalation email to all active admins
    if (adminEmails.length > 0) {
      type TicketProfile = { full_name: string | null; email: string | null };
      const profile = (ticket as Record<string, unknown>).profiles as TicketProfile | null;
      const customerName = profile?.full_name ?? profile?.email ?? 'Unknown Customer';
      const ageHours = Math.round(ageMs / 3600000);

      await resend.emails.send({
        from: fromAddress,
        to: adminEmails,
        subject: `[Level ${newLevel} Escalation] Support ticket: "${ticket.subject}"`,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="color:#34088f;margin-bottom:8px">Ticket Escalated — Level ${newLevel}</h2>
            <p style="color:#374151;margin-bottom:16px">
              A support ticket has exceeded SLA thresholds and requires immediate attention.
            </p>
            <table style="border-collapse:collapse;width:100%;margin-bottom:24px">
              <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;color:#374151;width:40%">Ticket</td>
                  <td style="padding:8px 12px;border-left:1px solid #e5e7eb;color:#111827">${ticket.subject}</td></tr>
              <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;color:#374151">Customer</td>
                  <td style="padding:8px 12px;border-left:1px solid #e5e7eb;color:#111827">${customerName}</td></tr>
              <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;color:#374151">Age</td>
                  <td style="padding:8px 12px;border-left:1px solid #e5e7eb;color:#dc2626">${ageHours} hours</td></tr>
              <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;color:#374151">Escalation Level</td>
                  <td style="padding:8px 12px;border-left:1px solid #e5e7eb;color:#dc2626;font-weight:700">Level ${newLevel} / 3</td></tr>
              <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;color:#374151">First Admin Reply</td>
                  <td style="padding:8px 12px;border-left:1px solid #e5e7eb;color:#111827">${ticket.first_admin_response_at ? new Date(ticket.first_admin_response_at as string).toLocaleString() : 'None yet'}</td></tr>
            </table>
            <a href="${appUrl}/admin/queries" style="display:inline-block;background:#34088f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
              View Ticket in Admin Portal
            </a>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px">
              This email was sent by Foremint's automated SLA monitoring system.
            </p>
          </div>
        `,
      }).catch((e: unknown) => {
        errors.push(`email for ticket ${ticket.id}: ${e instanceof Error ? e.message : String(e)}`);
      });
    }

    escalated++;
  }

  return NextResponse.json({
    ok: true,
    checked: (tickets ?? []).length,
    escalated,
    errors: errors.length > 0 ? errors : undefined,
    at: now.toISOString(),
  });
}
