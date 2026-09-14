/**
 * @file src/lib/email/templates/responsive.ts
 * @description Shared mobile styles for every Foremint email template.
 *
 * The templates are built as fixed 600px table layouts with 40px side padding,
 * which is correct on desktop but leaves roughly 280px of usable width on a
 * 360px phone. Headings wrapped onto three lines and the summary tables were
 * squeezed to the point of being hard to read.
 *
 * Email clients cannot use flexbox or container queries reliably, so the fix is
 * the standard one: a `@media` block in the document head that overrides the
 * inline padding and type sizes below 600px. Clients that ignore embedded
 * styles (a minority, mostly older desktop Outlook) simply keep the existing
 * desktop rendering, which is why the inline styles stay as the baseline.
 *
 * Classes are applied alongside the existing inline styles; `!important` is
 * required because inline styles otherwise win over stylesheet rules.
 */

export const RESPONSIVE_EMAIL_STYLES = `
  <style type="text/css">
    /* Prevent iOS auto-scaling the text up on rotate. */
    body {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    /* Stop Gmail/iOS linkifying phone numbers and dates in brand colours. */
    a[x-apple-data-detectors] {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }

    @media only screen and (max-width: 600px) {
      /* Card fills the viewport instead of holding a 600px minimum. */
      .fm-card {
        width: 100% !important;
        border-radius: 0 !important;
      }

      /* The main source of the problem: 40px each side on a 360px screen. */
      .fm-pad {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }

      /* Inner table cells carry their own 24px; 16px reads better when narrow. */
      .fm-pad-sm {
        padding-left: 16px !important;
        padding-right: 16px !important;
      }

      /* 24px headings wrapped to three lines on a phone. */
      .fm-h1 {
        font-size: 20px !important;
        line-height: 1.35 !important;
      }

      .fm-body {
        font-size: 14px !important;
      }

      /* Large currency figures overflowed their column. */
      .fm-amount {
        font-size: 18px !important;
      }

      /* Summary rows: let the label and value share the row without crushing
         either, rather than stacking them, so the table still scans as a table. */
      .fm-row-label {
        font-size: 12px !important;
      }

      .fm-row-value {
        font-size: 12px !important;
      }

      /* Full-width tap target, comfortably above the 44px minimum. */
      .fm-btn {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        text-align: center !important;
        padding-top: 15px !important;
        padding-bottom: 15px !important;
      }

      /* Trim the generous desktop vertical rhythm. */
      .fm-hero {
        padding-top: 28px !important;
        padding-bottom: 24px !important;
      }
    }
  </style>`
