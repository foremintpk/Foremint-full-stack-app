import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? 'Foremint <team@raobros.site>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://foremint.pk';

// ─── Admin: new ticket opened by customer ─────────────────────────────────

export interface NewTicketAdminEmailParams {
  /** Admin recipient email addresses (fetched dynamically from DB) */
  adminEmails: string[];
  customerName: string;
  customerEmail: string;
  ticketId: string;
  subject: string;
  firstMessage: string;
}

export async function sendNewTicketAdminEmail(params: NewTicketAdminEmailParams): Promise<void> {
  if (!params.adminEmails.length || !process.env.RESEND_API_KEY) return;

  await resend.emails
    .send({
      from: FROM_ADDRESS,
      to: params.adminEmails,
      subject: `New Support Ticket: "${params.subject}"`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#34088f;margin-bottom:4px">New Support Ticket</h2>
          <p style="color:#6b7280;margin-top:0">A customer just opened a ticket requiring your attention.</p>

          <table style="border-collapse:collapse;width:100%;margin:20px 0">
            <tr>
              <td style="padding:8px 12px;background:#f9fafb;font-weight:600;color:#374151;width:35%">From</td>
              <td style="padding:8px 12px;border-left:1px solid #e5e7eb;color:#111827">${params.customerName} &lt;${params.customerEmail}&gt;</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f9fafb;font-weight:600;color:#374151">Subject</td>
              <td style="padding:8px 12px;border-left:1px solid #e5e7eb;color:#111827">${params.subject}</td>
            </tr>
          </table>

          <div style="background:#f9fafb;border-left:3px solid #34088f;padding:16px;margin-bottom:24px;border-radius:0 8px 8px 0">
            <p style="color:#374151;margin:0;white-space:pre-wrap;line-height:1.6">${params.firstMessage}</p>
          </div>

          <a href="${APP_URL}/admin/queries" style="display:inline-block;background:#34088f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            Reply in Admin Portal
          </a>

          <p style="color:#9ca3af;font-size:12px;margin-top:24px">
            Foremint Support System · <a href="${APP_URL}" style="color:#9ca3af">${APP_URL}</a>
          </p>
        </div>
      `,
    })
    .catch((e: unknown) => {
      console.error('[sendNewTicketAdminEmail]', e instanceof Error ? e.message : e);
    });
}

// ─── Customer: admin replied to their ticket ──────────────────────────────

export interface AdminReplyCustomerEmailParams {
  customerEmail: string;
  customerName: string;
  subject: string;
  replyContent: string;
  ticketId: string;
}

export async function sendAdminReplyCustomerEmail(params: AdminReplyCustomerEmailParams): Promise<void> {
  if (!params.customerEmail || !process.env.RESEND_API_KEY) return;

  await resend.emails
    .send({
      from: FROM_ADDRESS,
      to: params.customerEmail,
      subject: `Re: ${params.subject} — Foremint Support`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#34088f;margin-bottom:4px">You have a new reply</h2>
          <p style="color:#6b7280;margin-top:0">Hi ${params.customerName}, our support team has replied to your ticket.</p>

          <p style="color:#374151;font-weight:600;margin-bottom:8px">Ticket: ${params.subject}</p>

          <div style="background:#f9fafb;border-left:3px solid #34088f;padding:16px;margin-bottom:24px;border-radius:0 8px 8px 0">
            <p style="color:#374151;margin:0;white-space:pre-wrap;line-height:1.6">${params.replyContent}</p>
          </div>

          <a href="${APP_URL}/dashboard/support" style="display:inline-block;background:#34088f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            View Full Conversation
          </a>

          <p style="color:#9ca3af;font-size:12px;margin-top:24px">
            You received this because you opened a support ticket at <a href="${APP_URL}" style="color:#9ca3af">Foremint</a>.
            To reply, visit your <a href="${APP_URL}/dashboard/support" style="color:#9ca3af">support dashboard</a>.
          </p>
        </div>
      `,
    })
    .catch((e: unknown) => {
      console.error('[sendAdminReplyCustomerEmail]', e instanceof Error ? e.message : e);
    });
}
