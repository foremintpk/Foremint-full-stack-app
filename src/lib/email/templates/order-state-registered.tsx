// ─── Customer "Registered in State / EIN Pending" Email Template ─────────────
// Sent when an order moves to `ein_pending`: the state has approved the LLC and
// the federal EIN filing is now underway.

import { RESPONSIVE_EMAIL_STYLES } from './responsive'

export interface StateRegisteredEmailProps {
  userName: string
  orderNumber: string
  businessName: string
  formationState: string
  dashboardUrl: string
  logoUrl?: string
}

export function StateRegisteredEmailHtml({
  userName,
  orderNumber,
  businessName,
  formationState,
  dashboardUrl,
  logoUrl,
}: StateRegisteredEmailProps): string {
  const greeting = userName || 'there'
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
  <title>Your LLC Is Registered</title>
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
              <div style="display:inline-block;width:56px;height:56px;background:#f4f0fe;border-radius:16px;line-height:56px;font-size:28px;margin-bottom:20px;">🏛</div>
              <h1 class="fm-h1" style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.4px;line-height:1.3;">
                Your LLC Is Officially Registered
              </h1>
              <p style="margin:0 auto;font-size:15px;color:#6b7280;line-height:1.7;max-width:440px;">
                Good news, ${greeting}. ${businessName ? `<strong style="color:#111827;">${businessName}</strong> has` : 'your company has'} been successfully registered${formationState ? ` in the State of ${formationState}` : ' in your formation state'}. We are now proceeding with your federal filing.
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
                        <td style="font-size:12px;font-weight:600;color:#374151;text-align:right;padding:11px 0;border-bottom:1px solid #f3f4f6;font-family:'SF Mono',Menlo,monospace;letter-spacing:0.02em;">#${orderNumber}</td>
                      </tr>` : ''}

                      ${businessName ? `
                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:11px 0;border-bottom:1px solid #f3f4f6;">LLC Name</td>
                        <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding:11px 0;border-bottom:1px solid #f3f4f6;">${businessName}</td>
                      </tr>` : ''}

                      ${formationState ? `
                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:11px 0;border-bottom:1px solid #f3f4f6;">Formation State</td>
                        <td style="font-size:13px;font-weight:500;color:#374151;text-align:right;padding:11px 0;border-bottom:1px solid #f3f4f6;">${formationState}</td>
                      </tr>` : ''}

                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:11px 0;border-bottom:1px solid #f3f4f6;">Updated</td>
                        <td style="font-size:13px;font-weight:500;color:#374151;text-align:right;padding:11px 0;border-bottom:1px solid #f3f4f6;">${displayDate}</td>
                      </tr>

                      <tr>
                        <td style="font-size:14px;font-weight:700;color:#111827;padding:14px 0 6px;">Stage</td>
                        <td style="font-size:14px;font-weight:700;color:#34088f;text-align:right;padding:14px 0 6px;">EIN Pending</td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── What Happens Next ── -->
          <tr>
            <td class="fm-pad" style="padding:0 40px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                <tr>
                  <td class="fm-pad-sm" style="padding:16px 24px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#374151;letter-spacing:0.12em;text-transform:uppercase;">What Happens Next</p>
                  </td>
                </tr>
                <tr>
                  <td class="fm-pad-sm" style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

                      <tr>
                        <td width="32" valign="top" style="padding-right:14px;padding-bottom:18px;">
                          <div style="width:26px;height:26px;background:#10b981;border-radius:8px;text-align:center;line-height:26px;font-size:13px;font-weight:700;color:#ffffff;">✓</div>
                        </td>
                        <td style="padding-bottom:18px;border-bottom:1px solid #f3f4f6;">
                          <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#111827;">State Registration Complete</p>
                          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">Your LLC is now a legally recognised entity${formationState ? ` in ${formationState}` : ''}.</p>
                        </td>
                      </tr>

                      <tr>
                        <td width="32" valign="top" style="padding-right:14px;padding-top:18px;padding-bottom:18px;">
                          <div style="width:26px;height:26px;background:#34088f;border-radius:8px;text-align:center;line-height:26px;font-size:11px;font-weight:700;color:#ffffff;">2</div>
                        </td>
                        <td style="padding-top:18px;padding-bottom:18px;border-bottom:1px solid #f3f4f6;">
                          <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#111827;">Federal EIN Filing In Progress</p>
                          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">We have begun your federal filing and are awaiting the issuance of your EIN letter from the IRS.</p>
                        </td>
                      </tr>

                      <tr>
                        <td width="32" valign="top" style="padding-right:14px;padding-top:18px;">
                          <div style="width:26px;height:26px;background:#e5e7eb;border-radius:8px;text-align:center;line-height:26px;font-size:11px;font-weight:700;color:#9ca3af;">3</div>
                        </td>
                        <td style="padding-top:18px;">
                          <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#111827;">EIN Received &amp; Formation Complete</p>
                          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">Once your EIN letter arrives, we will notify you and deliver every document to your dashboard.</p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Reassurance note ── -->
          <tr>
            <td class="fm-pad" style="padding:0 40px 36px;">
              <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.7;text-align:center;">
                No action is required from you at this stage. We will keep you updated step by step as your filing progresses.
              </p>
            </td>
          </tr>

          <!-- ── CTA ── -->
          <tr>
            <td class="fm-pad" align="center" style="padding:0 40px 40px;">
              <a href="${dashboardUrl}"
                class="fm-btn" style="display:inline-block;background:#34088f;color:#ffffff;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.02em;">
                View Your Dashboard
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
