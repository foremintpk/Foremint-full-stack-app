// ─── Customer "Order Status Update" Email Template ───────────────────────────
// One layout for every status email that is not built from the formation-complete
// template. The wording lives in ../orderStatusEmailContent.ts; the colours come
// from the status registry, so a status email always matches its badge.

import { RESPONSIVE_EMAIL_STYLES } from './responsive'
import type { StatusEmailContent } from '../orderStatusEmailContent'
import type { ToneStyle } from '@/lib/orders/orderStatus'

export interface OrderStatusUpdateEmailProps {
  userName: string
  orderNumber: string
  businessName: string
  formationState: string
  /** Outstanding balance in USD. Only shown when the content asks for it. */
  pendingAmount?: number
  billingUrl: string
  dashboardUrl: string
  logoUrl?: string
  /** Human label of the new status, shown in the summary card. */
  statusLabel: string
  tone: ToneStyle
  content: StatusEmailContent
}

/** Customer-supplied values (name, business) are untrusted HTML input. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Escape a copy string, then fill its tokens. Escaping first means a business
 * called `<script>` can only ever appear as text.
 */
function fillTokens(
  text: string,
  values: { name: string; business: string; state: string }
): string {
  return escapeHtml(text)
    .replace(/\{name\}/g, escapeHtml(values.name))
    .replace(
      /\{business\}/g,
      values.business
        ? `<strong style="color:#111827;">${escapeHtml(values.business)}</strong>`
        : 'your company'
    )
    .replace(
      /\{state\}/g,
      values.state ? `the State of ${escapeHtml(values.state)}` : 'your formation state'
    )
}

export function OrderStatusUpdateEmailHtml({
  userName,
  orderNumber,
  businessName,
  formationState,
  pendingAmount = 0,
  billingUrl,
  dashboardUrl,
  logoUrl,
  statusLabel,
  tone,
  content,
}: OrderStatusUpdateEmailProps): string {
  const values = {
    name: userName || 'there',
    business: businessName,
    state: formationState,
  }
  const hasBalance = Boolean(content.showBalance) && pendingAmount > 0
  const displayDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const stepsHtml = content.steps
    .map((step, i) => {
      const isLast = i === content.steps.length - 1
      return `
                      <tr>
                        <td width="32" valign="top" style="padding-right:14px;padding-top:${i === 0 ? '0' : '18px'};${isLast ? '' : 'padding-bottom:18px;'}">
                          <div style="width:26px;height:26px;background:${tone.solid};border-radius:8px;text-align:center;line-height:26px;font-size:11px;font-weight:700;color:#ffffff;">${i + 1}</div>
                        </td>
                        <td style="padding-top:${i === 0 ? '0' : '18px'};${isLast ? '' : 'padding-bottom:18px;border-bottom:1px solid #f3f4f6;'}">
                          <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#111827;">${escapeHtml(step.title)}</p>
                          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">${fillTokens(step.body, values)}</p>
                        </td>
                      </tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(content.subject)}</title>
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
              <div style="display:inline-block;width:56px;height:56px;background:${tone.bg};border-radius:16px;line-height:56px;font-size:28px;margin-bottom:20px;">${content.icon}</div>
              <h1 class="fm-h1" style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.4px;line-height:1.3;">
                ${escapeHtml(content.heading)}
              </h1>
              <p style="margin:0 auto;font-size:15px;color:#6b7280;line-height:1.7;max-width:440px;">
                ${fillTokens(content.intro, values)}
              </p>
            </td>
          </tr>

          <!-- ── Status Card ── -->
          <tr>
            <td class="fm-pad" style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#fafafa;border:1px solid #ede9fe;border-radius:10px;overflow:hidden;">
                <tr>
                  <td class="fm-pad-sm" style="padding:16px 24px;border-bottom:1px solid #ede9fe;background:#f4f0fe;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#34088f;letter-spacing:0.12em;text-transform:uppercase;">Current Status</p>
                  </td>
                </tr>
                <tr>
                  <td class="fm-pad-sm" style="padding:4px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

                      ${orderNumber ? `
                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:11px 0;border-bottom:1px solid #f3f4f6;">Order ID</td>
                        <td style="font-size:12px;font-weight:600;color:#374151;text-align:right;padding:11px 0;border-bottom:1px solid #f3f4f6;font-family:'SF Mono',Menlo,monospace;letter-spacing:0.02em;">#${escapeHtml(orderNumber)}</td>
                      </tr>` : ''}

                      ${businessName ? `
                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:11px 0;border-bottom:1px solid #f3f4f6;">LLC Name</td>
                        <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding:11px 0;border-bottom:1px solid #f3f4f6;">${escapeHtml(businessName)}</td>
                      </tr>` : ''}

                      ${formationState ? `
                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:11px 0;border-bottom:1px solid #f3f4f6;">Formation State</td>
                        <td style="font-size:13px;font-weight:500;color:#374151;text-align:right;padding:11px 0;border-bottom:1px solid #f3f4f6;">${escapeHtml(formationState)}</td>
                      </tr>` : ''}

                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:11px 0;border-bottom:1px solid #f3f4f6;">Updated</td>
                        <td style="font-size:13px;font-weight:500;color:#374151;text-align:right;padding:11px 0;border-bottom:1px solid #f3f4f6;">${displayDate}</td>
                      </tr>

                      <tr>
                        <td style="font-size:14px;font-weight:700;color:#111827;padding:14px 0 6px;">Status</td>
                        <td style="font-size:14px;font-weight:700;color:${tone.solid};text-align:right;padding:14px 0 6px;">${escapeHtml(statusLabel)}</td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${hasBalance ? `
          <!-- ── Outstanding balance ── -->
          <tr>
            <td class="fm-pad" style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;overflow:hidden;">
                <tr>
                  <td class="fm-pad-sm" style="padding:16px 24px;border-bottom:1px solid #fde68a;background:#fef3c7;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#92400e;letter-spacing:0.12em;text-transform:uppercase;">Outstanding Balance</p>
                  </td>
                </tr>
                <tr>
                  <td class="fm-pad-sm" style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="font-size:14px;font-weight:700;color:#92400e;">Amount Due</td>
                        <td class="fm-amount" style="font-size:22px;font-weight:800;color:#b45309;text-align:right;letter-spacing:-0.5px;">$${pendingAmount.toLocaleString()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''}

          <!-- ── Steps ── -->
          <tr>
            <td class="fm-pad" style="padding:0 40px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                <tr>
                  <td class="fm-pad-sm" style="padding:16px 24px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#374151;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(content.stepsTitle)}</p>
                  </td>
                </tr>
                <tr>
                  <td class="fm-pad-sm" style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      ${stepsHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${content.closing ? `
          <!-- ── Reassurance note ── -->
          <tr>
            <td class="fm-pad" style="padding:0 40px 36px;">
              <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.7;text-align:center;">
                ${fillTokens(content.closing, values)}
              </p>
            </td>
          </tr>` : ''}

          <!-- ── CTA ── -->
          <tr>
            <td class="fm-pad" align="center" style="padding:0 40px 40px;">
              <a href="${hasBalance ? billingUrl : dashboardUrl}"
                class="fm-btn" style="display:inline-block;background:#34088f;color:#ffffff;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.02em;">
                ${hasBalance ? 'Complete Your Payment' : 'View Your Dashboard'}
              </a>
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
                      You received this email because you have an active order with Foremint.
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
