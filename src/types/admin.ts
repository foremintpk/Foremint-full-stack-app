/**
 * @file src/types/admin.ts
 * @description Type definitions for the Foremint Admin Dashboard.
 * 
 * 1. Server vs Client choice rationale: Shared types used by both Server Components and Client Components.
 * 2. Caching layer: N/A (Type declarations only).
 * 3. RBAC: Constrains available admin roles.
 * 4. Revalidation / Cache Busting: N/A.
 */

export type AdminRole = 'administrator' | 'manager'

export interface AdminProfile {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  role: UserRole
  avatarUrl: string | null
  isActive: boolean
  createdAt: string | null
}


export interface UpdateEmailResult {
  error?: string
  requiresReLogin?: boolean
}

export interface UpdatePasswordResult {
  error?: string
  requiresReLogin?: boolean
}


export interface NavItem {
  label: string
  href: string
  icon: string
  badgeKey?: keyof BadgeCounts
}

export interface BadgeCounts {
  llcRegistrations: number
  notifications: number
  tickets: number
}

export interface AdminNotification {
  id: string
  title: string | null
  body: string | null
  type: string
  link: string | null
  isRead: boolean
  createdAt: string
}

// Used by API route — payload jsonb is NEVER included
export type SafeAdminNotification = AdminNotification

export interface NotificationApiResponse {
  count: number
  items: SafeAdminNotification[]
}

export type CouponDiscountType = 'percentage' | 'amount'
export type CouponStatus = 'active' | 'inactive' | 'deleted'

export interface Coupon {
  id: string
  name: string
  code: string
  discountType: CouponDiscountType
  discountValue: number
  totalUses: number
  usedCount: number
  perUserUses: number
  status: CouponStatus
  createdAt: string
  updatedAt: string
}

export interface CouponUsage {
  id: string
  couponId: string
  couponName: string
  couponCode: string
  userId: string
  userName: string | null
  userEmail: string | null
  orderId: string | null
  orderNumber: string | null
  discountAmount: number
  usedAt: string
}

// ─── Overview ────────────────────────────────────────────────────────────────

export type DateRangeFilter =
  | 'today'
  | 'yesterday'
  | '7d'
  | '14d'
  | '30d'
  | '60d'
  | '90d'

export interface DateRange {
  label: string          // display label e.g. "Last 7 Days"
  key: DateRangeFilter
  startDate: () => Date  // factory so it's always computed at call time
  endDate: () => Date
}

export interface LlcStats {
  total: number
  pending: number
  processing: number
  completed: number
}

export interface PaypalStats {
  total: number
  pending: number
  processing: number
  completed: number
}

export interface EarningsBreakdown {
  llcRevenue: number
  paypalRevenue: number
  invoiceCommissions: number
  totalEarnings: number
  llcPercent: number       // 0–100
  paypalPercent: number
  invoicePercent: number
}

export interface DailyTrendPoint {
  date: string             // YYYY-MM-DD
  llcOrders: number
  paypalOrders: number
  totalRevenue: number
}

export interface OverviewStats {
  llc: LlcStats
  paypal: PaypalStats
  earnings: EarningsBreakdown
  dailyTrend: DailyTrendPoint[]
  rangeKey: DateRangeFilter
  fetchedAt: string        // ISO string — for display "Last updated X ago"
}

// ─── LLC Registrations List ───────────────────────────────────────────────────

export type LlcOrderStatus = 'pending' | 'processing' | 'formed' | 'cancelled'
export type PaymentStatus  = 'unpaid'  | 'paid'        | 'partial'
export type SortDirection  = 'asc' | 'desc'
export type LlcSortField   = 'created_at' | 'order_number' | 'grand_total'

export interface LlcOrderRow {
  id: string
  orderNumber: string                // FM-XXXXX
  clientName: string | null          // profiles.full_name
  clientEmail: string                // profiles.email
  llcName: string                    // formatLlcName(form_snapshot.businessName)
  status: LlcOrderStatus
  paymentStatus: PaymentStatus
  pendingAmount: number              // grand_total when unpaid, else 0
  formationState: string | null      // formation_state_name
  createdAt: string                  // ISO string
  submittedAt: string | null         // ISO string
  isNew: boolean                     // true if not in admin_order_views
}

export interface LlcTopStats {
  total: number
  pending: number
  processing: number
  formed: number
}

export interface LlcListFilters {
  q: string
  status: LlcOrderStatus | 'all'
  dateFilter: DateRangeFilter | 'all'
  page: number
  pageSize: 10 | 25 | 50
  sort: LlcSortField
  dir: SortDirection
}

export interface LlcListResult {
  orders: LlcOrderRow[]
  totalCount: number
  totalPages: number
  filters: LlcListFilters
  stats: LlcTopStats
}

// ─── Order Detail ─────────────────────────────────────────────────────────────

export type OrderStatus = 'pending' | 'processing' | 'formed'
// Note: 'cancelled' exists in DB but is not selectable from status dropdown UI

export interface OrderMember {
  index: number
  position: string
  name: string
  address: string
  city: string
  state: string
  country: string
  ssnItin: string | null
  idDocId: string | null        // document.id for the member's identity document
  idDocUrl: string | null       // kept for legacy reference; prefer routing through idDocId
  hasResubmitRequest: boolean   // true if pending resubmission request exists
}

export interface OrderAddon {
  id: string
  name: string
  price: number
  isSelected: boolean
}

export interface OrderDocument {
  id: string
  documentType: string
  fileName: string
  fileSize: number | null
  mimeType: string | null
  url: string
  uploadedAt: string
  isVerified: boolean
  slotKey?: string | null
  publicId?: string | null
  storagePath?: string | null
  supersededAt?: string | null
  isActive?: boolean
  cloudinaryResourceType?: string | null
}

export interface OrderStatusHistory {
  id: string
  oldStatus: string
  newStatus: string
  changedBy: string       // admin full_name
  changedAt: string
  note: string | null
}

export interface ResubmissionRequest {
  id: string
  memberIndex: number | null
  fieldName: string
  requestedAt: string
  status: 'pending' | 'resubmitted' | 'cancelled'
  note: string | null
}

export interface OrderDetail {
  // Core
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus    // from 4C types

  // Display
  llcName: string                 // formatLlcName(form_snapshot.businessName)
  formationState: string | null
  formationStateName: string | null
  createdAt: string
  submittedAt: string | null

  // Customer (General Info)
  clientId: string
  clientName: string | null
  clientEmail: string
  clientPhone: string | null

  // Formation Info
  entityType: string | null       // admin_override_entity_type ?? form_snapshot.entityType
  memberType: string | null
  formationPackage: string | null
  formationPackageName: string | null

  // Financial
  grandTotal: number
  stateFee: number
  packagePrice: number
  addonsTotal: number
  paymentReceiptUrl: string | null

  // Members
  members: OrderMember[]

  // Addons (selected)
  selectedAddons: string[]
  addonsSnapshot: Record<string, unknown>[]

  // Documents
  documents: OrderDocument[]

  // History
  statusHistory: OrderStatusHistory[]

  // Resubmission requests (pending only)
  resubmissionRequests: ResubmissionRequest[]

  // Raw snapshot (needed for FormationInfo edits)
  formSnapshot: Record<string, unknown>

  // Admin-set company details (EIN, filing ID, addresses, formation date)
  companyDetails: FormationDetails | null

  // Admin-assigned internal add-ons (services added post-order by admin)
  internalAddons: InternalAddon[]

  // Billing adjustments (payments, discounts, charges) entered by admin
  billingEntries: BillingEntry[]

  // Coupon discount applied at checkout (from form_snapshot)
  couponDiscount: number
}

// ─── Internal Operations (Chunk 4E) ──────────────────────────────────────────

export interface AddressBlock {
  street: string
  city: string
  state: string
  zip: string
  country: string
}

export interface FormationDetails {
  einNumber: string | null
  filingId: string | null
  formationDate: string | null       // ISO date string
  stateRenewalDate: string | null
  stateRenewalFees: number | null
  mailingAddress: AddressBlock | null
  tradingAddress: AddressBlock | null
  businessAddress: AddressBlock | null
}

export interface InternalAddon {
  id: string
  orderId: string
  addonId: string
  addonName: string
  addonPrice: number
  description: string | null
  documentId: string | null
  documentUrl: string | null
  assignedBy: string
  assignedAt: string
  removedAt: string | null
}

export interface BillingEntry {
  id: string
  title: string
  amount: number
  type: 'discount' | 'charge' | 'payment'
  createdAt: string
}

export interface OrderBilling {
  packagePrice: number
  stateFee: number
  customerAddonsTotal: number
  internalAddonsTotal: number
  grandTotalUsd: number
  grandTotalPkr: number | null
  advanceAmount: number | null
  advancePaymentDate: string | null
  discountPkr: number | null
  secondPaymentAmount: number | null
}

// ─── Packages System (Chunk 4F) ──────────────────────────────────────────────

export type PackageStatus = 'draft' | 'published';

export interface Package {
  id: string;
  name: string;
  price: number;
  features: string[];
  status: PackageStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Users Management System (Chunk 4G) ──────────────────────────────────────────

export type UserRole = 'administrator' | 'manager' | 'customer' | 'b2b_customer'

export interface AdminUser {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  role: UserRole
  avatarUrl: string | null
  isActive: boolean
  createdAt: string
}

export interface UserListFilters {
  search?: string
  role?: UserRole | 'all'
  status?: 'active' | 'inactive' | 'all'
  page?: number
  pageSize?: number
}

export interface UserListResult {
  users: AdminUser[]
  total: number
  totalPages: number
}

// ─── B2B Customers System ─────────────────────────────────────────────────────

/** A B2B customer (profiles.role = 'b2b_customer') plus their assigned LLC orders. */
export interface B2BCustomer {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  isActive: boolean
  createdAt: string | null
  assignedOrderIds: string[]
  assignedOrderCount: number
}

/** An LLC order option shown in the admin's assignment multi-select. */
export interface AssignableOrder {
  id: string
  orderNumber: string
  llcName: string
  ownerName: string | null
  ownerEmail: string | null
}

// ─── PayPal Orders System (Chunk 4I) ──────────────────────────────────────────

export type PaypalOrderStatus = 'pending' | 'completed' | 'suspended' | 'failed'
export type PaypalOrderType = 'new' | 'replacement'

export interface PaypalOrder {
  id: string
  customerName: string
  email: string
  date: string          // ISO date string YYYY-MM-DD
  dealAmount: number
  type: PaypalOrderType
  status: PaypalOrderStatus
  notes: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface PaypalOrderFilters {
  search?: string
  status?: PaypalOrderStatus | 'all'
  type?: PaypalOrderType | 'all'
  dateRange?: '7d' | '14d' | '30d' | '60d' | '90d' | 'all'
  page?: number
  pageSize?: number
}

export interface PaypalOrderListResult {
  orders: PaypalOrder[]
  total: number
  totalPages: number
}

export interface PaypalOrderStats {
  totalOrders: number
  totalAmount: number
  pending: number
  completed: number
  suspended: number
  failed: number
}

// ─── Invoices System (Chunk 4J) ──────────────────────────────────────────────

export interface Invoice {
  id: string
  invoiceNumber: string           // e.g. INV-00001
  date: string                    // YYYY-MM-DD
  name: string
  totalAmountPkr: number
  commissionEarned: number
  notes: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface InvoiceFilters {
  search?: string
  dateRange?: 'today' | 'yesterday' | '7d' | '14d' | '30d' | '60d' | '90d' | 'all'
  page?: number
  pageSize?: number
}

export interface InvoiceListResult {
  invoices: Invoice[]
  total: number
  totalPages: number
}

export interface InvoiceStats {
  totalInvoices: number
  totalRevenuePkr: number
  totalCommission: number
  thisMonthCount: number
}

// Addons System
export interface AddonCategory {
  id: string
  name: string
  createdAt: string
}

export type AddonStatus = 'draft' | 'published'

export interface Addon {
  id: string
  name: string
  price: number
  features: string[]           // stored as text[] in DB
  status: AddonStatus
  categories: AddonCategory[]  // joined via addon_category_map
  createdAt: string
  updatedAt: string
}

export interface AddonFilters {
  categoryId?: string | 'all'
  status?: AddonStatus | 'all'
  search?: string
}

export interface AddonFormData {
  name: string
  price: number
  featuresRaw: string          // newline-separated; converted to string[] before save
  status: AddonStatus
  categoryIds: string[]        // multi-select category IDs
}

// ─── Expenses System (Chunk 4H) ──────────────────────────────────────────────

export interface ExpenseCategory {
  id: string
  name: string
  icon: string      // Lucide icon name, e.g. 'package', 'monitor'
  color: string     // hex, e.g. '#8b5cf6'
  createdAt: string
}

export interface Expense {
  id: string
  categoryId: string
  categoryName: string
  categoryIcon: string
  categoryColor: string
  description: string
  date: string          // YYYY-MM-DD
  amount: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export type ExpenseDateRange =
  | 'today' | 'yesterday' | '7d' | '14d' | '30d' | '60d' | '90d' | 'all'

export interface ExpenseFilters {
  categoryId?: string | 'all'
  dateRange?: ExpenseDateRange
  search?: string
  page?: number
  pageSize?: number
}

export interface ExpenseListResult {
  expenses: Expense[]
  total: number
  totalPages: number
}

export interface ExpenseStats {
  totalExpenses: number
  totalAmount: number
  byCategory: Array<{
    categoryId: string
    categoryName: string
    categoryColor: string
    amount: number
    count: number
  }>
}
