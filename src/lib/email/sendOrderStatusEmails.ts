/**
 * @file src/lib/email/sendOrderStatusEmails.ts
 * @description Customer-facing emails tied to LLC order status transitions.
 *
 * Three senders live here:
 *   • sendStateRegisteredEmail  — order moved to `ein_pending`
 *   • sendFormationCompleteEmail — order moved to `formed`
 *   • sendPaymentReminderEmail   — payment reminder for `payment_pending`
 *
 * Every sender returns a result rather than throwing. A failed status email must
 * never roll back the status change that triggered it, and the bulk reminder
 * needs to record per-recipient outcomes instead of aborting the whole run.
 */

import { Resend } from 'resend'
import { StateRegisteredEmailHtml } from './templates/order-state-registered'
import { FormationCompleteEmailHtml } from './templates/order-formation-complete'
import { PaymentReminderEmailHtml } from './templates/order-payment-reminder'

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

/** No extra fields beyond the shared set — state registration owes nothing. */
export type StateRegisteredParams = BaseStatusEmailParams

export interface FormationCompleteParams extends BaseStatusEmailParams {
  /** Outstanding balance in USD; 0 when nothing is owed. */
  pendingAmount?: number
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
 * State registration confirmed; federal EIN filing now under way.
 * Triggered when an order transitions to `ein_pending`.
 */
export async function sendStateRegisteredEmail(
  params: StateRegisteredParams
): Promise<EmailResult> {
  const { to, userName, orderNumber, businessName, formationState = '' } = params

  return dispatch(
    'State registered',
    to,
    'Your LLC Is Registered and Federal Filing Has Begun',
    StateRegisteredEmailHtml({
      userName,
      orderNumber,
      businessName,
      formationState,
      dashboardUrl: `${getAppUrl()}/dashboard`,
      logoUrl: getLogoUrl(),
    })
  )
}

/**
 * EIN received and formation complete. When a balance remains the email leads
 * with the billing call to action.
 * Triggered when an order transitions to `formed`.
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
      billingUrl: `${getAppUrl()}/dashboard/billing`,
      dashboardUrl: `${getAppUrl()}/dashboard`,
      logoUrl: getLogoUrl(),
    })
  )
}

/**
 * Courteous reminder that a balance is outstanding. Sent in bulk from the LLC
 * Registrations list for orders in `payment_pending`.
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
