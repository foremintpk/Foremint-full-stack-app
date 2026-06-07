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
  logoUrl?: string
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
  logoUrl,
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
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f0f2f5;">
    <tr>
      <td align="center" style="padding:48px 16px 40px;">

        <!-- ── Outer card ── -->
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
          style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08),0 8px 32px rgba(0,0,0,0.06);max-width:600px;width:100%;">

          <!-- ── Top accent bar ── -->
          <tr>
            <td style="background:#34088f;height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- ── Logo header ── -->
          <tr>
            <td align="center" style="padding:36px 40px 28px;">
              ${logoUrl
                ? `<img src="${logoUrl}" alt="Foremint" width="140" style="height:auto;display:block;margin:0 auto;" />`
                : `<p style="margin:0;font-size:22px;font-weight:800;color:#34088f;font-family:Georgia,serif;letter-spacing:-0.5px;">Foremint</p>`
              }
            </td>
          </tr>

          <!-- ── Divider ── -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:#f3f4f6;"></div>
            </td>
          </tr>

          <!-- ── Hero ── -->
          <tr>
            <td style="padding:40px 40px 32px;text-align:center;">
              <div style="display:inline-block;width:56px;height:56px;background:#f4f0fe;border-radius:16px;line-height:56px;font-size:28px;margin-bottom:20px;">✓</div>
              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.4px;line-height:1.3;">
                Order Received, ${greeting}
              </h1>
              <p style="margin:0 auto;font-size:15px;color:#6b7280;line-height:1.7;max-width:420px;">
                Thank you for choosing Foremint. We have received your LLC formation order and our team is ready to get started.
              </p>
            </td>
          </tr>

          <!-- ── Order Summary Card ── -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#fafafa;border:1px solid #ede9fe;border-radius:10px;overflow:hidden;">
                <!-- Card header -->
                <tr>
                  <td style="padding:16px 24px;border-bottom:1px solid #ede9fe;background:#f4f0fe;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#34088f;letter-spacing:0.12em;text-transform:uppercase;">Order Summary</p>
                  </td>
                </tr>
                <!-- Rows -->
                <tr>
                  <td style="padding:4px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

                      ${orderNumber ? `
                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:11px 0;border-bottom:1px solid #f3f4f6;">Order ID</td>
                        <td style="font-size:12px;font-weight:600;color:#374151;text-align:right;padding:11px 0;border-bottom:1px solid #f3f4f6;font-family:'SF Mono',Menlo,monospace;letter-spacing:0.02em;">#${orderNumber}</td>
                      </tr>` : ''}

                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:11px 0;border-bottom:1px solid #f3f4f6;">Date</td>
                        <td style="font-size:13px;font-weight:500;color:#374151;text-align:right;padding:11px 0;border-bottom:1px solid #f3f4f6;">${displayDate}</td>
                      </tr>

                      ${businessName ? `
                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:11px 0;border-bottom:1px solid #f3f4f6;">LLC Name</td>
                        <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding:11px 0;border-bottom:1px solid #f3f4f6;">${businessName}</td>
                      </tr>` : ''}

                      ${packageName ? `
                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:11px 0;border-bottom:1px solid #f3f4f6;">Package</td>
                        <td style="font-size:13px;font-weight:500;color:#374151;text-align:right;padding:11px 0;border-bottom:1px solid #f3f4f6;">${packageName}</td>
                      </tr>` : ''}

                      ${formationState ? `
                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:11px 0;border-bottom:1px solid #f3f4f6;">Formation State</td>
                        <td style="font-size:13px;font-weight:500;color:#374151;text-align:right;padding:11px 0;border-bottom:1px solid #f3f4f6;">${formationState}</td>
                      </tr>` : ''}

                      <tr>
                        <td style="font-size:14px;font-weight:700;color:#111827;padding:14px 0 6px;">Total</td>
                        <td style="font-size:22px;font-weight:800;color:#34088f;text-align:right;padding:14px 0 6px;letter-spacing:-0.5px;">$${grandTotal.toLocaleString()}</td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── What Happens Next ── -->
          <tr>
            <td style="padding:0 40px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 24px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#374151;letter-spacing:0.12em;text-transform:uppercase;">What Happens Next</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

                      <tr>
                        <td width="32" valign="top" style="padding-right:14px;padding-bottom:18px;">
                          <div style="width:26px;height:26px;background:#34088f;border-radius:8px;text-align:center;line-height:26px;font-size:11px;font-weight:700;color:#ffffff;">1</div>
                        </td>
                        <td style="padding-bottom:18px;border-bottom:1px solid #f3f4f6;">
                          <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#111827;">Order Review</p>
                          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">Our team will review your submission within 1–2 business days.</p>
                        </td>
                      </tr>

                      <tr>
                        <td width="32" valign="top" style="padding-right:14px;padding-top:18px;padding-bottom:18px;">
                          <div style="width:26px;height:26px;background:#34088f;border-radius:8px;text-align:center;line-height:26px;font-size:11px;font-weight:700;color:#ffffff;">2</div>
                        </td>
                        <td style="padding-top:18px;padding-bottom:18px;border-bottom:1px solid #f3f4f6;">
                          <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#111827;">Processing Updates</p>
                          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">We will keep you informed at every step. We'll reach out if additional information is required.</p>
                        </td>
                      </tr>

                      <tr>
                        <td width="32" valign="top" style="padding-right:14px;padding-top:18px;">
                          <div style="width:26px;height:26px;background:#34088f;border-radius:8px;text-align:center;line-height:26px;font-size:11px;font-weight:700;color:#ffffff;">3</div>
                        </td>
                        <td style="padding-top:18px;">
                          <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#111827;">LLC Formation Complete</p>
                          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">Your LLC will be officially registered and all documents delivered to your dashboard.</p>
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
            <td align="center" style="padding:0 40px 40px;">
              <a href="${dashboardUrl}"
                style="display:inline-block;background:#34088f;color:#ffffff;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.02em;">
                Track Your Order
              </a>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f3f4f6;background:#fafafa;">
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
                      You received this email because you placed an order on Foremint.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /outer card -->

      </td>
    </tr>
  </table>

</body>
</html>`
}
