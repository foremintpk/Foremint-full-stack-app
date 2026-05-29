import { Resend } from 'resend'
import { OrderCreatedEmailHtml } from './templates/order-created'
import { AdminOrderNotificationHtml } from './templates/admin-order-notification'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? 'Foremint <team@raobros.site>'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderConfirmationParams {
  /** Recipient customer email */
  to: string
  /** Customer's display name */
  userName: string
  /** Order number or UUID fallback */
  orderNumber: string
  /** LLC / business name */
  businessName: string
  /** Order grand total in USD */
  grandTotal: number
  /** Package / service name */
  packageName: string
  /** Formation state display name */
  formationState: string
  /** Optional formatted order date string (defaults to today) */
  orderDate?: string
}

export interface AdminOrderNotificationParams {
  /** Customer display name */
  customerName: string
  /** Customer email address */
  customerEmail: string
  /** Internal order UUID */
  orderId: string
  /** Human-readable order number (optional) */
  orderNumber?: string
  /** Package / service name */
  serviceName: string
  /** LLC / business name (optional) */
  businessName?: string
  /** Formation state display name (optional) */
  formationState?: string
  /** Order grand total in USD (optional) */
  grandTotal?: number
  /** Formatted order date string */
  orderDate: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getAdminEmail(): string | null {
  return (
    process.env.ADMIN_EMAIL ??
    process.env.NEXT_PUBLIC_ADMIN_EMAIL ??
    null
  )
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? ''
}

// ─── Customer Order Confirmation ──────────────────────────────────────────────

/**
 * Sends an order confirmation email to the customer immediately after a
 * successful LLC order creation. Safe to call fire-and-forget with .catch().
 */
export async function sendOrderConfirmationEmail(
  params: OrderConfirmationParams
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — skipping customer confirmation email')
    return
  }

  const {
    to,
    userName,
    orderNumber,
    businessName,
    grandTotal,
    packageName,
    formationState,
    orderDate,
  } = params

  const displayDate = orderDate ?? formatDate()
  const dashboardUrl = `${getAppUrl()}/dashboard`

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: '🎉 Congratulations! Your LLC Order Has Been Received',
    html: OrderCreatedEmailHtml({
      userName,
      orderNumber,
      businessName,
      grandTotal,
      packageName,
      formationState,
      dashboardUrl,
      orderDate: displayDate,
    }),
  })

  if (error) {
    console.error('[Email] Customer confirmation send failed:', error)
    throw new Error(`[Email] Customer confirmation failed: ${error.message}`)
  }

  console.log(`[Email] ✓ Customer confirmation sent → ${to} (order: ${orderNumber})`)
}

// ─── Admin Order Notification ─────────────────────────────────────────────────

/**
 * Sends an admin notification email when a new LLC order is created.
 * Requires ADMIN_EMAIL env var to be set. Safe to call fire-and-forget with .catch().
 */
export async function sendAdminOrderNotificationEmail(
  params: AdminOrderNotificationParams
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — skipping admin notification email')
    return
  }

  const adminEmail = getAdminEmail()
  if (!adminEmail) {
    console.warn('[Email] ADMIN_EMAIL not configured — skipping admin notification email')
    return
  }

  const {
    customerName,
    customerEmail,
    orderId,
    orderNumber,
    serviceName,
    businessName,
    formationState,
    grandTotal,
    orderDate,
  } = params

  const adminDashboardUrl = `${getAppUrl()}/admin/llc-registrations/${orderId}`

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: adminEmail,
    subject: `📩 New LLC Order Received — ${customerName}`,
    html: AdminOrderNotificationHtml({
      customerName,
      customerEmail,
      orderId,
      orderNumber,
      serviceName,
      businessName,
      formationState,
      grandTotal,
      orderDate,
      adminDashboardUrl,
    }),
  })

  if (error) {
    console.error('[Email] Admin notification send failed:', error)
    throw new Error(`[Email] Admin notification failed: ${error.message}`)
  }

  console.log(`[Email] ✓ Admin notification sent → ${adminEmail} (order: ${orderId})`)
}
