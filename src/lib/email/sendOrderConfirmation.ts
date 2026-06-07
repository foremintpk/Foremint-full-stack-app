import { Resend } from 'resend'
import { OrderCreatedEmailHtml } from './templates/order-created'
import { AdminOrderNotificationHtml } from './templates/admin-order-notification'
import { AdminReceiptUploadedHtml } from './templates/admin-receipt-uploaded'

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

function getLogoUrl(): string {
  const base = getAppUrl()
  return base ? `${base}/logo/blue.png` : ''
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
    subject: 'Your LLC Order Has Been Received — Foremint',
    html: OrderCreatedEmailHtml({
      userName,
      orderNumber,
      businessName,
      grandTotal,
      packageName,
      formationState,
      dashboardUrl,
      orderDate: displayDate,
      logoUrl: getLogoUrl(),
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
    subject: `New LLC Order Received — ${customerName}`,
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
      logoUrl: getLogoUrl(),
    }),
  })

  if (error) {
    console.error('[Email] Admin notification send failed:', error)
    throw new Error(`[Email] Admin notification failed: ${error.message}`)
  }

  console.log(`[Email] ✓ Admin notification sent → ${adminEmail} (order: ${orderId})`)
}

// ─── Admin Receipt-Uploaded Notification ──────────────────────────────────────

export interface AdminReceiptUploadedParams {
  customerName: string
  customerEmail: string
  businessName: string
  orderId: string
  orderNumber: string
  formationState?: string
  pendingAmount?: number
}

/**
 * Emails the admin when a customer uploads a bank transfer receipt.
 * Safe to call fire-and-forget with .catch().
 */
export async function sendAdminReceiptUploadedEmail(
  params: AdminReceiptUploadedParams
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — skipping receipt-uploaded email')
    return
  }
  const adminEmail = getAdminEmail()
  if (!adminEmail) {
    console.warn('[Email] ADMIN_EMAIL not configured — skipping receipt-uploaded email')
    return
  }

  const { customerName, customerEmail, businessName, orderId, orderNumber, formationState, pendingAmount } = params
  const adminDashboardUrl = `${getAppUrl()}/admin/llc-registrations/${orderId}`

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: adminEmail,
    subject: `Payment Receipt Uploaded — ${businessName} (${customerName})`,
    html: AdminReceiptUploadedHtml({
      customerName,
      customerEmail,
      businessName,
      orderNumber,
      formationState,
      pendingAmount,
      uploadedAt: formatDate(),
      adminDashboardUrl,
      logoUrl: getLogoUrl(),
    }),
  })

  if (error) {
    console.error('[Email] Receipt-uploaded send failed:', error)
    throw new Error(`[Email] Receipt-uploaded failed: ${error.message}`)
  }

  console.log(`[Email] ✓ Receipt-uploaded notice sent → ${adminEmail} (order: ${orderId})`)
}
