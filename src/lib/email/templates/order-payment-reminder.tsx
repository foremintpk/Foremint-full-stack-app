// ─── Customer "Payment Pending" Reminder Email Template ──────────────────────
// Sent from the LLC Registrations list when an admin triggers a reminder for
// orders in the `payment_pending` status. The tone is a courteous reminder, not
// a dunning notice — the work is complete and the balance is the last step.

import { RESPONSIVE_EMAIL_STYLES } from './responsive'

export interface PaymentReminderEmailProps {
  userName: string
  orderNumber: string
  businessName: string
  /** Outstanding balance in USD. Omitted from the layout when 0. */
  pendingAmount?: number
  billingUrl: string
  dashboardUrl: string
  logoUrl?: string
}

export function PaymentReminderEmailHtml({
  userName,
  orderNumber,
  businessName,
  pendingAmount = 0,
  billingUrl,
  dashboardUrl,
  logoUrl,
}: PaymentReminderEmailProps): string {
  const greeting = userName || 'there'
  const hasAmount = pendingAmount > 0
  const displayDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pending Payment on Your Order</title>
  ${RESPONSIVE_EMAIL_STYLES}
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f0f2f5;">
    <tr>
      <td align="center" style="padding:48px 16px 40px;">

        <table width="600" cellpadding="0" cellspacing="0" role="presentation" class="fm-card"
          style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08),0 8px 32px rgba(0,0,0,0.06);max-width:600px;width:100%;">

          <tr>
            <td style="background:#34088f;height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td class="fm-pad" align="center" style="padding:36px 40px 28px;">
              ${logoUrl
                ? `<img src="${logoUrl}" alt="Foremint" width="140" style="height:auto;display:block;margin:0 auto;" />`
                : `<p style="margin:0;font-size:22px;font-weight:800;color:#34088f;font-family:Georgia,serif;letter-spacing:-0.5px;">Foremint</p>`
              }
            </td>
          </tr>

          <tr>
            <td class="fm-pad" style="padding:0 40px;">
              <div style="height:1px;background:#f3f4f6;"></div>
            </td>
          </tr>

          <!-- ── Hero ── -->
          <tr>
            <td class="fm-pad fm-hero" style="padding:40px 40px 32px;text-align:center;">
              <div style="display:inline-block;width:56px;height:56px;background:#fef3c7;border-radius:16px;line-height:56px;font-size:28px;margin-bottom:20px;">💳</div>
              <h1 class="fm-h1" style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.4px;line-height:1.3;">
                A Pending Payment on Your Order
              </h1>
              <p style="margin:0 auto;font-size:15px;color:#6b7280;line-height:1.7;max-width:440px;">
                Hello ${greeting}. The formation work for ${businessName ? `<strong style="color:#111827;">${businessName}</strong>` : 'your company'} is complete. To move your order forward, we kindly ask that you clear the remaining balance on your account.
              </p>
            </td>
          </tr>

          <!-- ── Balance Card ── -->
          <tr>
            <td class="fm-pad" style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;overflow:hidden;">
                <tr>
                  <td class="fm-pad-sm" style="padding:16px 24px;border-bottom:1px solid #fde68a;background:#fef3c7;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#92400e;letter-spacing:0.12em;text-transform:uppercase;">Payment Pending</p>
                  </td>
                </tr>
                <tr>
                  <td class="fm-pad-sm" style="padding:4px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

                      ${orderNumber ? `
                      <tr>
                        <td style="font-size:13px;color:#b45309;padding:11px 0;border-bottom:1px solid #fde68a;">Order ID</td>
                        <td style="font-size:12px;font-weight:600;color:#92400e;text-align:right;padding:11px 0;border-bottom:1px solid #fde68a;font-family:'SF Mono',Menlo,monospace;letter-spacing:0.02em;">#${orderNumber}</td>
                      </tr>` : ''}

                      ${businessName ? `
                      <tr>
                        <td style="font-size:13px;color:#b45309;padding:11px 0;border-bottom:1px solid #fde68a;">LLC Name</td>
                        <td style="font-size:13px;font-weight:600;color:#92400e;text-align:right;padding:11px 0;border-bottom:1px solid #fde68a;">${businessName}</td>
                      </tr>` : ''}

                      <tr>
                        <td style="font-size:13px;color:#b45309;padding:11px 0;${hasAmount ? 'border-bottom:1px solid #fde68a;' : ''}">Date</td>
                        <td style="font-size:13px;font-weight:500;color:#92400e;text-align:right;padding:11px 0;${hasAmount ? 'border-bottom:1px solid #fde68a;' : ''}">${displayDate}</td>
                      </tr>

                      ${hasAmount ? `
                      <tr>
                        <td style="font-size:14px;font-weight:700;color:#92400e;padding:14px 0 6px;">Amount Due</td>
                        <td class="fm-amount" style="font-size:22px;font-weight:800;color:#b45309;text-align:right;padding:14px 0 6px;letter-spacing:-0.5px;">$${pendingAmount.toLocaleString()}</td>
                      </tr>` : ''}

                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Why this matters ── -->
          <tr>
            <td class="fm-pad" style="padding:0 40px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                <tr>
                  <td class="fm-pad-sm" style="padding:16px 24px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#374151;letter-spacing:0.12em;text-transform:uppercase;">How to Complete Your Payment</p>
                  </td>
                </tr>
                <tr>
                  <td class="fm-pad-sm" style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

                      <tr>
                        <td width="32" valign="top" style="padding-right:14px;padding-bottom:18px;">
                          <div style="width:26px;height:26px;background:#34088f;border-radius:8px;text-align:center;line-height:26px;font-size:11px;font-weight:700;color:#ffffff;">1</div>
                        </td>
                        <td style="padding-bottom:18px;border-bottom:1px solid #f3f4f6;">
                          <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#111827;">Open the Billing Section</p>
                          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">Sign in to your dashboard and open Billing to view your outstanding invoice.</p>
                        </td>
                      </tr>

                      <tr>
                        <td width="32" valign="top" style="padding-right:14px;padding-top:18px;padding-bottom:18px;">
                          <div style="width:26px;height:26px;background:#34088f;border-radius:8px;text-align:center;line-height:26px;font-size:11px;font-weight:700;color:#ffffff;">2</div>
                        </td>
                        <td style="padding-top:18px;padding-bottom:18px;border-bottom:1px solid #f3f4f6;">
                          <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#111827;">Submit Your Payment</p>
                          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">Pay by card, or upload your bank transfer receipt directly in the billing section.</p>
                        </td>
                      </tr>

                      <tr>
                        <td width="32" valign="top" style="padding-right:14px;padding-top:18px;">
                          <div style="width:26px;height:26px;background:#34088f;border-radius:8px;text-align:center;line-height:26px;font-size:11px;font-weight:700;color:#ffffff;">3</div>
                        </td>
                        <td style="padding-top:18px;">
                          <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#111827;">We Proceed Immediately</p>
                          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">As soon as your payment is confirmed, we continue with the next stage of your order.</p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Courtesy note ── -->
          <tr>
            <td class="fm-pad" style="padding:0 40px 36px;">
              <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.7;text-align:center;">
                If you have already made this payment, please disregard this message, as our records may not yet reflect it. If anything is unclear, simply reply to this email and our team will assist you.
              </p>
            </td>
          </tr>

          <!-- ── CTA ── -->
          <tr>
            <td class="fm-pad" align="center" style="padding:0 40px 40px;">
              <a href="${billingUrl}"
                class="fm-btn" style="display:inline-block;background:#34088f;color:#ffffff;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.02em;">
                Clear Your Pending Payment
              </a>
              <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">
                Or visit your <a href="${dashboardUrl}" style="color:#34088f;text-decoration:none;font-weight:500;">dashboard</a> for a full overview.
              </p>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td class="fm-pad" style="padding:24px 40px;border-top:1px solid #f3f4f6;background:#fafafa;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#374151;">Need help?</p>
                    <p style="margin:0;font-size:12px;color:#9ca3af;">
                      <a href="mailto:support@foremint.com" style="color:#34088f;text-decoration:none;font-weight:500;">support@foremint.com</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:16px;">
                    <p style="margin:0;font-size:11px;color:#d1d5db;line-height:1.6;">
                      © ${new Date().getFullYear()} Foremint LLC. All rights reserved.<br />
                      You received this email because you have an outstanding balance on a Foremint order.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`
}
