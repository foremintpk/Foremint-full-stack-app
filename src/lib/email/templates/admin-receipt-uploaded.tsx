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
}: AdminReceiptUploadedProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Receipt Uploaded — Foremint Admin</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
          style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.09);max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#111827;padding:26px 40px;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;font-family:Manrope,Arial,sans-serif;">Foremint</p>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="background:#34088f;color:#ffffff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;letter-spacing:0.1em;text-transform:uppercase;">Admin</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="background:#dbeafe;padding:14px 40px;border-bottom:2px solid #bfdbfe;">
              <p style="margin:0;font-size:13px;font-weight:700;color:#1e40af;">
                🧾 Payment Receipt Uploaded — Verification Needed
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.75;">
                <strong>${customerName}</strong> has uploaded a bank transfer receipt for their LLC order
                <strong>${businessName}</strong>. Please review the proof of payment in the admin dashboard
                and confirm the payment to update the order's billing status.
              </p>

              <!-- Customer Details -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#f8f7ff;border-radius:12px;margin-bottom:20px;">
                <tr>
                  <td style="padding:22px 24px;">
                    <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#34088f;letter-spacing:0.10em;text-transform:uppercase;">Customer</p>
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:7px 0;border-bottom:1px solid #ede9fe;">Name</td>
                        <td style="font-size:13px;font-weight:700;color:#111827;text-align:right;padding:7px 0;border-bottom:1px solid #ede9fe;">${customerName}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:7px 0;">Email</td>
                        <td style="font-size:13px;text-align:right;padding:7px 0;">
                          <a href="mailto:${customerEmail}" style="color:#34088f;text-decoration:none;font-weight:600;">${customerEmail}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Order Details -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#f9fafb;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:22px 24px;">
                    <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#374151;letter-spacing:0.10em;text-transform:uppercase;">Order</p>
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:7px 0;border-bottom:1px solid #f0f0f0;">LLC / Business Name</td>
                        <td style="font-size:13px;font-weight:700;color:#111827;text-align:right;padding:7px 0;border-bottom:1px solid #f0f0f0;">${businessName}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:7px 0;border-bottom:1px solid #f0f0f0;">Order Number</td>
                        <td style="font-size:12px;font-weight:700;color:#111827;text-align:right;padding:7px 0;border-bottom:1px solid #f0f0f0;font-family:monospace;">${orderNumber}</td>
                      </tr>
                      ${formationState ? `
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:7px 0;border-bottom:1px solid #f0f0f0;">Formation State</td>
                        <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding:7px 0;border-bottom:1px solid #f0f0f0;">${formationState}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:7px 0;${pendingAmount !== undefined ? 'border-bottom:1px solid #f0f0f0;' : ''}">Uploaded At</td>
                        <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding:7px 0;${pendingAmount !== undefined ? 'border-bottom:1px solid #f0f0f0;' : ''}">${uploadedAt}</td>
                      </tr>
                      ${pendingAmount !== undefined ? `
                      <tr>
                        <td style="font-size:14px;font-weight:700;color:#111827;padding:14px 0 0;">Pending Balance</td>
                        <td style="font-size:20px;font-weight:800;color:#34088f;text-align:right;padding:14px 0 0;">$${pendingAmount.toLocaleString()}</td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <a href="${adminDashboardUrl}"
                style="display:inline-block;background:#34088f;color:#ffffff;font-size:14px;font-weight:700;padding:14px 36px;border-radius:100px;text-decoration:none;letter-spacing:0.03em;">
                Review Receipt in Admin Dashboard →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
                This is an automated admin notification from Foremint. Do not reply to this email.<br />
                © ${new Date().getFullYear()} Foremint LLC. All rights reserved.
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
