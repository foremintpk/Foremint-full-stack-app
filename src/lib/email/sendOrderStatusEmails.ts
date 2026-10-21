/**
 * @file src/lib/email/sendOrderStatusEmails.ts
 * @description Customer-facing emails tied to LLC order status transitions.
 *
 * `sendOrderStatusEmail` is the entry point for status changes: it picks the
 * right email for the new status (see orderStatusEmailContent.ts for the full
 * table). Two further senders are used directly:
 *   • sendFormationCompleteEmail — `pending_payment` / `formation_completed`
 *   • sendPaymentReminderEmail   — bulk reminder for the payment-pending statuses
 *
 * Every sender returns a result rather than throwing. A failed status email must
 * never roll back the status change that triggered it, and the bulk reminder
 * needs to record per-recipient outcomes instead of aborting the whole run.
 */

import { Resend } from 'resend'
import { FormationCompleteEmailHtml } from './templates/order-formation-complete'
import { OrderStatusUpdateEmailHtml } from './templates/order-status-update'
import { PaymentReminderEmailHtml } from './templates/order-payment-reminder'
import { GENERIC_STATUS_EMAILS, usesFormationCompleteTemplate } from './orderStatusEmailContent'
import { TONE_STYLES, getStatusDisplay, type OrderStatusValue } from '@/lib/orders/orderStatus'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? 'Foremint <team@raobros.site>'

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? ''
}

function getLogoUrl(): string {
  const base = getAppUrl()
  return base ? `${base}/logo/blue.png` : ''
}

export interface EmailResult {
  ok: boolean
  /** Present when ok === false. Safe to log. */
  error?: string
  /** True when the send was skipped because email is not configured. */
  skipped?: boolean
}

interface BaseStatusEmailParams {
  /** Recipient customer email */
  to: string
  userName: string
  orderNumber: string
  businessName: string
  formationState?: string
}

export interface FormationCompleteParams extends BaseStatusEmailParams {
  /** Outstanding balance in USD; 0 when nothing is owed. */
  pendingAmount?: number
  /** Status named in the summary card; defaults to "Formation Completed". */
  statusLabel?: string
}

export interface PaymentReminderParams extends BaseStatusEmailParams {
  pendingAmount?: number
}

/** Shared guard + error shaping so each sender stays declarative. */
async function dispatch(
  label: string,
  to: string,
  subject: string,
  html: string
): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[Email] RESEND_API_KEY not set — skipping ${label} email`)
    return { ok: false, skipped: true, error: 'RESEND_API_KEY not configured' }
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    })

    if (error) {
      console.error(`[Email] ${label} send failed:`, error)
      return { ok: false, error: error.message }
    }

    console.log(`[Email] ✓ ${label} sent → ${to}`)
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    console.error(`[Email] ${label} threw:`, message)
    return { ok: false, error: message }
  }
}

/**
 * EIN received. When a balance remains the email leads with the billing call to
 * action. Triggered when an order moves to `pending_payment` (balance due) or
 * `formation_completed`.
 */
export async function sendFormationCompleteEmail(
  params: FormationCompleteParams
): Promise<EmailResult> {
  const {
    to,
    userName,
    orderNumber,
    businessName,
    formationState = '',
    pendingAmount = 0,
    statusLabel,
  } = params

  return dispatch(
    'Formation complete',
    to,
    pendingAmount > 0
      ? 'Your EIN Has Arrived and One Step Remains'
      : 'Your EIN Has Arrived and Your Formation Is Complete',
    FormationCompleteEmailHtml({
      userName,
      orderNumber,
      businessName,
      formationState,
      pendingAmount,
      statusLabel,
      billingUrl: `${getAppUrl()}/dashboard/billing`,
      dashboardUrl: `${getAppUrl()}/dashboard`,
      logoUrl: getLogoUrl(),
    })
  )
}

/**
 * Email the customer about an order's new status.
 *
 * Callers should check `hasStatusEmail(status)` first; a status with no email
 * (Pending, which checkout already confirmed) returns a skipped result rather
 * than throwing, so a mistaken call is harmless.
 */
export async function sendOrderStatusEmail(
  status: OrderStatusValue,
  params: FormationCompleteParams
): Promise<EmailResult> {
  const { label, tone } = getStatusDisplay(status)

  if (usesFormationCompleteTemplate(status)) {
    return sendFormationCompleteEmail({
      ...params,
      statusLabel: label,
      // Formation Completed means nothing is outstanding, so it never leads
      // with a balance even if one is still on the books.
      pendingAmount: status === 'pending_payment' ? params.pendingAmount : 0,
    })
  }

  const content = GENERIC_STATUS_EMAILS[status]
  if (!content || !tone) {
    return { ok: false, skipped: true, error: `No email defined for status "${status}"` }
  }

  return dispatch(
    label,
    params.to,
    content.subject,
    OrderStatusUpdateEmailHtml({
      userName: params.userName,
      orderNumber: params.orderNumber,
      businessName: params.businessName,
      formationState: params.formationState ?? '',
      pendingAmount: params.pendingAmount ?? 0,
      billingUrl: `${getAppUrl()}/dashboard/billing`,
      dashboardUrl: `${getAppUrl()}/dashboard`,
      logoUrl: getLogoUrl(),
      statusLabel: label,
      tone: TONE_STYLES[tone],
      content,
    })
  )
}

/**
 * Courteous reminder that a balance is outstanding. Sent in bulk from the LLC
 * Registrations list for orders in `pending_payment` or `itin_payment_pending`.
 */
export async function sendPaymentReminderEmail(
  params: PaymentReminderParams
): Promise<EmailResult> {
  const { to, userName, orderNumber, businessName, pendingAmount = 0 } = params

  return dispatch(
    'Payment reminder',
    to,
    'A Pending Payment on Your Foremint Order',
    PaymentReminderEmailHtml({
      userName,
      orderNumber,
      businessName,
      pendingAmount,
      billingUrl: `${getAppUrl()}/dashboard/billing`,
      dashboardUrl: `${getAppUrl()}/dashboard`,
      logoUrl: getLogoUrl(),
    })
  )
}
