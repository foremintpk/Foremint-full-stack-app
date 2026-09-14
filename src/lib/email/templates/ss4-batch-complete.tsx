// ─── SS-4 Scheduled Batch Complete — Admin Notification ──────────────────────
//
// Sent after an AUTOMATIC run only. A manual run happens with the operator
// watching the progress banner, so emailing them about it would be noise.

import { RESPONSIVE_EMAIL_STYLES } from './responsive'

export interface Ss4BatchCompleteProps {
  /** Documents generated successfully. */
  passed: number;
  /** Orders that failed, with the reason shown per row. */
  failures: { orderNumber: string; reason: string }[];
  /** When the run finished, already formatted for display. */
  finishedAt: string;
  /** Deep link to the EIN section, scrolled to this run. */
  batchUrl: string;
  logoUrl?: string;
}

const escapeHtml = (value: string): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function Ss4BatchCompleteHtml({
  passed,
  failures,
  finishedAt,
  batchUrl,
  logoUrl,
}: Ss4BatchCompleteProps): string {
  const failed = failures.length;
  const total = passed + failed;

  const failureRows = failures
    .slice(0, 12)
    .map(
      (f) => `
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;font-weight:600;white-space:nowrap;vertical-align:top;">
                ${escapeHtml(f.orderNumber)}
              </td>
              <td style="padding:8px 0 8px 16px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280;line-height:1.5;">
                ${escapeHtml(f.reason)}
              </td>
            </tr>`
    )
    .join('');

  const moreFailures =
    failed > 12
      ? `<p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">…and ${failed - 12} more. See the full list in the dashboard.</p>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SS-4 documents generated — Foremint</title>
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

          ${
            logoUrl
              ? `<tr>
            <td class="fm-pad" align="center" style="padding:28px 32px 0;">
              <img src="${escapeHtml(logoUrl)}" alt="Foremint" height="28" style="display:block;border:0;height:28px;" />
            </td>
          </tr>`
              : ''
          }

          <tr>
            <td class="fm-pad" style="padding:28px 32px 8px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#34088f;">
                Scheduled run
              </p>
              <h1 class="fm-h1" style="margin:0;font-size:22px;line-height:1.3;font-weight:700;color:#111827;">
                ${passed} SS-4 document${passed === 1 ? '' : 's'} generated
              </h1>
              <p style="margin:8px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
                The automatic batch finished on ${escapeHtml(finishedAt)}.
                ${
                  failed > 0
                    ? `${passed} of ${total} orders succeeded; ${failed} need attention.`
                    : 'Every order in the run succeeded.'
                }
              </p>
            </td>
          </tr>

          <!-- Counts -->
          <tr>
            <td class="fm-pad" style="padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
                <tr>
                  <td align="center" style="padding:16px 12px;border-right:1px solid #e5e7eb;">
                    <div style="font-size:24px;font-weight:700;color:#065f46;line-height:1;">${passed}</div>
                    <div style="margin-top:4px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Generated</div>
                  </td>
                  <td align="center" style="padding:16px 12px;">
                    <div style="font-size:24px;font-weight:700;color:${failed > 0 ? '#991b1b' : '#9ca3af'};line-height:1;">${failed}</div>
                    <div style="margin-top:4px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Failed</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Download -->
          <tr>
            <td class="fm-pad" align="center" style="padding:24px 32px 4px;">
              <a href="${escapeHtml(batchUrl)}"
                style="display:inline-block;background:#34088f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
                Download the documents
              </a>
              <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">
                Opens the EIN section, where this run can be downloaded as a ZIP.
              </p>
            </td>
          </tr>

          ${
            failed > 0
              ? `<tr>
            <td class="fm-pad" style="padding:24px 32px 0;">
              <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#991b1b;">
                Needs attention
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                ${failureRows}
              </table>
              ${moreFailures}
            </td>
          </tr>`
              : ''
          }

          <tr>
            <td class="fm-pad" style="padding:28px 32px 32px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;border-top:1px solid #f3f4f6;padding-top:16px;">
                You are receiving this because SS-4 generation is set to Automatic.
                Switch it to Manual under Admin → EIN to stop these emails.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}
