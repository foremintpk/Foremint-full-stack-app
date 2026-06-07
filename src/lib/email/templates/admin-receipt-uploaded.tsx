// ─── Admin Receipt-Uploaded Email Template ────────────────────────────────────

export interface AdminReceiptUploadedProps {
  customerName: string
  customerEmail: string
  businessName: string
  orderNumber: string
  formationState?: string
  pendingAmount?: number
  uploadedAt: string
  adminDashboardUrl: string
  logoUrl?: string
}

export function AdminReceiptUploadedHtml({
  customerName,
  customerEmail,
  businessName,
  orderNumber,
  formationState,
  pendingAmount,
  uploadedAt,
  adminDashboardUrl,
  logoUrl,
}: AdminReceiptUploadedProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Receipt Uploaded — Foremint Admin</title>
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
            <td style="background:#111827;height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- ── Logo header ── -->
          <tr>
            <td align="center" style="padding:32px 40px 24px;background:#111827;">
              ${logoUrl
                ? `<img src="${logoUrl}" alt="Foremint" width="130" style="height:auto;display:block;margin:0 auto;" />`
                : `<p style="margin:0;font-size:20px;font-weight:800;color:#ffffff;font-family:Georgia,serif;letter-spacing:-0.5px;">Foremint</p>`
              }
              <p style="margin:8px 0 0;font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:0.16em;text-transform:uppercase;">Admin Notification</p>
            </td>
          </tr>

          <!-- ── Alert Banner ── -->
          <tr>
            <td style="background:#eff6ff;padding:14px 40px;border-bottom:1px solid #bfdbfe;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding-right:10px;font-size:16px;line-height:1;">🧾</td>
                  <td>
                    <p style="margin:0;font-size:13px;font-weight:600;color:#1e40af;">Payment Receipt Uploaded — Verification Required</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="padding:36px 40px 32px;">
              <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.75;">
                <strong style="color:#111827;">${customerName}</strong> has uploaded a bank transfer receipt for their LLC order
                <strong style="color:#111827;">${businessName}</strong>. Please review the proof of payment and confirm to update the order billing status.
              </p>

              <!-- Customer Info -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#fafafa;border:1px solid #ede9fe;border-radius:10px;overflow:hidden;margin-bottom:16px;">
                <tr>
                  <td style="padding:14px 24px;border-bottom:1px solid #ede9fe;background:#f4f0fe;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#34088f;letter-spacing:0.12em;text-transform:uppercase;">Customer</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:10px 0;border-bottom:1px solid #f3f4f6;">Name</td>
                        <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding:10px 0;border-bottom:1px solid #f3f4f6;">${customerName}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:10px 0;">Email</td>
                        <td style="font-size:13px;text-align:right;padding:10px 0;">
                          <a href="mailto:${customerEmail}" style="color:#34088f;text-decoration:none;font-weight:500;">${customerEmail}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Order / Receipt Details -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 24px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#374151;letter-spacing:0.12em;text-transform:uppercase;">Order Details</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:10px 0;border-bottom:1px solid #f3f4f6;">LLC / Business Name</td>
                        <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding:10px 0;border-bottom:1px solid #f3f4f6;">${businessName}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:10px 0;border-bottom:1px solid #f3f4f6;">Order Number</td>
                        <td style="font-size:12px;font-weight:600;color:#374151;text-align:right;padding:10px 0;border-bottom:1px solid #f3f4f6;font-family:'SF Mono',Menlo,monospace;">#${orderNumber}</td>
                      </tr>
                      ${formationState ? `
                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:10px 0;border-bottom:1px solid #f3f4f6;">Formation State</td>
                        <td style="font-size:13px;font-weight:500;color:#374151;text-align:right;padding:10px 0;border-bottom:1px solid #f3f4f6;">${formationState}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="font-size:13px;color:#9ca3af;padding:10px 0;${pendingAmount !== undefined ? 'border-bottom:1px solid #f3f4f6;' : ''}">Receipt Uploaded</td>
                        <td style="font-size:13px;font-weight:500;color:#374151;text-align:right;padding:10px 0;${pendingAmount !== undefined ? 'border-bottom:1px solid #f3f4f6;' : ''}">${uploadedAt}</td>
                      </tr>
                      ${pendingAmount !== undefined ? `
                      <tr>
                        <td style="font-size:14px;font-weight:700;color:#111827;padding:14px 0 6px;">Pending Balance</td>
                        <td style="font-size:22px;font-weight:800;color:#34088f;text-align:right;padding:14px 0 6px;letter-spacing:-0.5px;">$${pendingAmount.toLocaleString()}</td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <a href="${adminDashboardUrl}"
                style="display:inline-block;background:#111827;color:#ffffff;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.02em;">
                Review Receipt in Dashboard
              </a>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f3f4f6;background:#fafafa;">
              <p style="margin:0;font-size:11px;color:#d1d5db;line-height:1.6;">
                Automated admin notification from Foremint. Do not reply to this email.<br />
                © ${new Date().getFullYear()} Foremint LLC. All rights reserved.
              </p>
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
