// ─── Customer Order Confirmation Email Template ───────────────────────────────

export interface OrderCreatedEmailProps {
  userName: string
  orderNumber: string
  businessName: string
  grandTotal: number
  packageName: string
  formationState: string
  dashboardUrl: string
  orderDate?: string
}

export function OrderCreatedEmailHtml({
  userName,
  orderNumber,
  businessName,
  grandTotal,
  packageName,
  formationState,
  dashboardUrl,
  orderDate,
}: OrderCreatedEmailProps): string {
  const greeting = userName || 'there'
  const displayDate =
    orderDate ??
    new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LLC Order Confirmation — Foremint</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
          style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(52,8,143,0.10);max-width:600px;width:100%;">

          <!-- ── Header ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#34088f 0%,#5b21b6 100%);padding:28px 40px;">
              <p style="margin:0;font-size:24px;font-weight:800;color:#ffffff;font-family:Manrope,Arial,sans-serif;letter-spacing:-0.5px;">Foremint</p>
              <p style="margin:5px 0 0;font-size:11px;color:rgba(255,255,255,0.65);letter-spacing:0.12em;text-transform:uppercase;">LLC Formation Services</p>
            </td>
          </tr>

          <!-- ── Hero ── -->
          <tr>
            <td style="padding:44px 40px 0;text-align:center;">
              <div style="font-size:52px;margin-bottom:18px;line-height:1;">🎉</div>
              <h1 style="margin:0 0 14px;font-size:26px;font-weight:800;color:#111827;font-family:Manrope,Arial,sans-serif;line-height:1.25;">
                Congratulations, ${greeting}!
              </h1>
              <p style="margin:0 auto;font-size:15px;color:#6b7280;line-height:1.75;max-width:440px;">
                Thank you for choosing Foremint. We have successfully received your LLC order and our team has started processing your request.
              </p>
            </td>
          </tr>

          <!-- ── Order Details Card ── -->
          <tr>
            <td style="padding:32px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#f4f0fe;border-radius:12px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 18px;font-size:11px;font-weight:700;color:#34088f;letter-spacing:0.10em;text-transform:uppercase;">Order Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      ${orderNumber ? `
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:7px 0;border-bottom:1px solid #e9e3fc;">Order ID</td>
                        <td style="font-size:13px;font-weight:700;color:#111827;text-align:right;padding:7px 0;border-bottom:1px solid #e9e3fc;font-family:monospace;">${orderNumber}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:7px 0;border-bottom:1px solid #e9e3fc;">Order Date</td>
                        <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding:7px 0;border-bottom:1px solid #e9e3fc;">${displayDate}</td>
                      </tr>
                      ${businessName ? `
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:7px 0;border-bottom:1px solid #e9e3fc;">LLC Name</td>
                        <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding:7px 0;border-bottom:1px solid #e9e3fc;">${businessName}</td>
                      </tr>` : ''}
                      ${packageName ? `
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:7px 0;border-bottom:1px solid #e9e3fc;">Package</td>
                        <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding:7px 0;border-bottom:1px solid #e9e3fc;">${packageName}</td>
                      </tr>` : ''}
                      ${formationState ? `
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:7px 0;border-bottom:1px solid #e9e3fc;">Formation State</td>
                        <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding:7px 0;border-bottom:1px solid #e9e3fc;">${formationState}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="font-size:14px;font-weight:700;color:#111827;padding:14px 0 0;">Total</td>
                        <td style="font-size:20px;font-weight:800;color:#34088f;text-align:right;padding:14px 0 0;">$${grandTotal.toLocaleString()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── What Happens Next ── -->
          <tr>
            <td style="padding:24px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#f9fafb;border-radius:12px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 20px;font-size:11px;font-weight:700;color:#374151;letter-spacing:0.10em;text-transform:uppercase;">What Happens Next</p>
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td width="36" valign="top" style="padding-right:12px;padding-bottom:16px;">
                          <div style="width:26px;height:26px;background:#34088f;border-radius:50%;text-align:center;line-height:26px;font-size:11px;font-weight:800;color:#ffffff;">1</div>
                        </td>
                        <td style="padding-bottom:16px;">
                          <p style="margin:0 0 3px;font-size:13px;font-weight:700;color:#111827;">Order Review</p>
                          <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">Our team will review your submission within 1–2 business days.</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="36" valign="top" style="padding-right:12px;padding-bottom:16px;">
                          <div style="width:26px;height:26px;background:#34088f;border-radius:50%;text-align:center;line-height:26px;font-size:11px;font-weight:800;color:#ffffff;">2</div>
                        </td>
                        <td style="padding-bottom:16px;">
                          <p style="margin:0 0 3px;font-size:13px;font-weight:700;color:#111827;">Processing Updates</p>
                          <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">We will keep you updated at every step. If we need additional information, we will contact you promptly.</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="36" valign="top" style="padding-right:12px;">
                          <div style="width:26px;height:26px;background:#34088f;border-radius:50%;text-align:center;line-height:26px;font-size:11px;font-weight:800;color:#ffffff;">3</div>
                        </td>
                        <td>
                          <p style="margin:0 0 3px;font-size:13px;font-weight:700;color:#111827;">LLC Formation Complete</p>
                          <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">Your LLC will be officially registered and all documents delivered.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── CTA ── -->
          <tr>
            <td style="padding:32px 40px;text-align:center;">
              <a href="${dashboardUrl}"
                style="display:inline-block;background:#34088f;color:#ffffff;font-size:14px;font-weight:700;padding:14px 36px;border-radius:100px;text-decoration:none;letter-spacing:0.03em;">
                Track Your Order →
              </a>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #f0ecfc;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#374151;">Need help?</p>
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
                Email: <a href="mailto:support@foremint.com" style="color:#34088f;text-decoration:none;font-weight:600;">support@foremint.com</a>
              </p>
              <p style="margin:16px 0 0;font-size:11px;color:#d1d5db;line-height:1.6;">
                © ${new Date().getFullYear()} Foremint LLC. All rights reserved.<br />
                You received this email because you placed an order on Foremint.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
