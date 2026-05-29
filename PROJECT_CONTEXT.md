# Foremint — Project Context & Chunk Tracker
## Last Updated: 2026-05-20

---

## Project Identity
- **App Name:** Foremint
- **Type:** LLC Client Onboarding & Management Platform
- **Stack:** Next.js (App Router) · Supabase · Vercel · Cloudinary · TypeScript
- **Deployment:** Vercel
- **Design:** Primary `#34088f` · BG `#FFFFFF` · Text `#000000`
  · Fonts: Manrope (headings) / Inter (body) · Border radius `0.125rem`

---

## 🚫 Mandatory Project Rules

### 1. Proxy Architecture (Next.js 16+)
- **File:** `src/proxy.ts` — NOT `middleware.ts`.
- **Restriction:** DO NOT create, restore, rename, or reference `middleware.ts`.
- **Logic:** ALL auth, RBAC, session refresh, redirects, route protection → `proxy.ts` only.
- **Adaptation:** Any doc/tutorial referencing `middleware.ts` → adapt to `proxy.ts`.

### 2. UTF-8 Encoding & File Safety
- Every file MUST be **UTF-8** encoded — no BOM, no Windows-1252, no binary bytes.
- All files must remain parseable by TypeScript, Next.js, ESLint, and Prettier.
- Compilation MUST succeed after any modification.

### 3. TypeScript
- Strict mode on. NO `any` types. Use `unknown` + type guards.

### 4. Component Strategy
- Server Components by default. `"use client"` only where strictly needed.

### 5. Naming Conventions
- Files/folders: `kebab-case` · Components: `PascalCase` · Functions/vars: `camelCase`

### 6. Auth
- Supabase Auth with `@supabase/ssr`. NEVER use deprecated `auth-helpers`.
- Roles: `administrator` | `manager` | `customer` — stored in `profiles.role`.

### 7. Storage (Files)
- Files >100KB or video → Cloudinary
- Small docs/images ≤100KB → Supabase Storage

---

## ⚡ Performance & Caching Architecture
### (Established in Chunk 4A — ALL subsequent chunks MUST follow)

The goal is to minimize backend round-trips without sacrificing accuracy.
Four cooperative layers are used:

### Layer 1 — `unstable_cache` (Server-side TTL cache)

Wrap all server data-fetching functions in `unstable_cache`. Every call MUST specify:
- A unique cache key array that includes all dynamic variables (adminId, filters, etc.)
- An explicit `revalidate` TTL in seconds
- A `tags` array for targeted invalidation via `revalidateTag`

**TTL Reference Table (use these exact values in all chunks):**

| Data                        | TTL (s) | Tag pattern                  |
|-----------------------------|---------|------------------------------|
| Admin profile               | 300     | `admin-profile-{adminId}`    |
| Unread notification count   | 30      | `notif-count-{adminId}`      |
| Notification list           | 30      | `notif-list-{adminId}`       |
| Unread order badge count    | 60      | `unread-orders-{adminId}`    |
| Nav badge counts            | 60      | `nav-badges-{adminId}`       |
| Overview stats / analytics  | 120     | `overview-stats`             |
| Order list page             | 60      | `order-list`                 |
| Single order detail         | 60      | `order-{orderId}`            |
| User list                   | 120     | `user-list`                  |
| Package/addon config        | 600     | `packages`, `addons`         |

Pattern:
```typescript
export function getCachedResource(id: string) {
  return unstable_cache(
    async () => { /* supabase query */ },
    [`resource-${id}`],
    { revalidate: 60, tags: [`resource-${id}`] }
  )()
}
```

### Layer 2 — `cache()` (Per-request dedup)

Wrap fetchers called by multiple Server Components in a single render with
React's `cache()`. Prevents duplicate DB queries for the same data within one
request, even if 5 components all call the same function.

```typescript
import { cache } from 'react'
export const getAdminUser = cache(async () => { /* ... */ })
```

Apply `cache()` to any function called in: layouts, headers, sidebars, pages
simultaneously.

### Layer 3 — Route Segment Config

Set `revalidate` at the page/layout level:
- Admin layout: `export const revalidate = 60`
- Static config pages (packages, addons): `export const revalidate = 600`
- Highly dynamic pages: `export const dynamic = 'force-dynamic'`

### Layer 4 — Client-side Browser Storage (Non-sensitive UI state only)

**Storage Security Matrix — CANONICAL — NEVER DEVIATE:**

```
┌──────────────────────────────────┬────────────────┬────────────────────────────────┐
│ Data                             │ Allowed Store  │ Reason                         │
├──────────────────────────────────┼────────────────┼────────────────────────────────┤
│ Sidebar collapsed state          │ localStorage   │ UI pref, survives tab close    │
│ Active nav section               │ sessionStorage │ Navigation state only          │
│ Notification list (sanitized)    │ sessionStorage │ No PII, no payload jsonb       │
│ Last notification fetch time     │ sessionStorage │ Staleness check only           │
│ Unread badge count               │ sessionStorage │ Integer, not sensitive         │
├──────────────────────────────────┼────────────────┼────────────────────────────────┤
│ Auth tokens / JWT                │ ❌ NEVER        │ SSR cookies only               │
│ User role                        │ ❌ NEVER        │ Fetch from live session        │
│ User email / full name / PII     │ ❌ NEVER        │ Sensitive                      │
│ Order details / client data      │ ❌ NEVER        │ Sensitive business data        │
│ Document URLs (signed)           │ ❌ NEVER        │ Signed URLs must not be cached │
│ Payment data                     │ ❌ NEVER        │ Financial data                 │
│ notifications.payload (jsonb)    │ ❌ NEVER        │ May contain sensitive metadata │
└──────────────────────────────────┴────────────────┴────────────────────────────────┘
```

**Allowed localStorage keys (exhaustive list — add new ones here):**
- `fm_sidebar_collapsed` — "true" | "false"

**Allowed sessionStorage keys (exhaustive list — add new ones here):**
- `fm_admin_notif_cache` — JSON: `{ fetchedAt, count, items: SafeNotification[] }`
- `fm_admin_badge_count` — stringified integer
- `fm_admin_overview_filter` — active date filter string

### Revalidation Pattern (Server Actions)

When an admin performs a write action, always call:
```typescript
revalidateTag('relevant-tag')       // targeted: only affected data
revalidatePath('/admin', 'layout')  // layout-level re-render
```

Full refresh action `refreshAdminData(adminId)` revalidates all admin tags at once.

### Client Fetch Strategy (NotificationDropdown pattern — reuse for all client data)

```
Mount → check sessionStorage cache
  ├─ cache fresh?  → render from cache, no fetch
  └─ stale/missing → fetch /api/admin/... → write to sessionStorage

Tab becomes visible → if stale → background fetch (stale-while-revalidate)
Write action → clear relevant cache keys → re-fetch
```

### API Routes — Cache-Control Headers

All admin API routes MUST set:
```
Cache-Control: private, max-age=30, stale-while-revalidate=60
```
`private` ensures CDN/proxies never cache user-specific data.

---

## Auth API Routes

| Method | Route | Roles | Description |
|--------|-------|-------|-------------|
| `GET` | `/api/auth/logout` | administrator, manager, customer | Signs out the active session via `supabase.auth.signOut()` and redirects to `/login`. Usable as a plain `<a href>` or `router.push`. |
| `GET` | `/api/auth/callback` | — (public) | OAuth + email confirmation redirect handler (Supabase standard). |

### Logout Usage
```tsx
// Link (works for all roles)
<a href="/api/auth/logout">Log out</a>

// Programmatic
router.push('/api/auth/logout');
window.location.href = '/api/auth/logout';
```

> Note: `/api/*` routes are whitelisted in `proxy.ts` — no RBAC check runs on them.
> Session destruction is handled server-side; no client-side cookie clearing needed.

---

## Database — RLS Fix Log (2026-05-18)

**Problem:** `public.profiles` had recursive RLS policies that caused
`"infinite recursion detected in policy for relation profiles"` whenever
`proxy.ts` tried to fetch a user's role. This blocked all admin access.

**Root causes:**
1. `admin_read_all` policy used `EXISTS (SELECT 1 FROM profiles ...)` inside a profiles policy → recursion.
2. `view_all_profiles_admin` called `get_my_role()` which ran `SELECT role FROM profiles` — but `get_my_role()` lacked `SET search_path = ''`, so it ran under the caller's RLS context → recursion via function.
3. `update_own_profile` WITH CHECK used a self-referential subquery on `profiles`.

**Fix applied (migration: `fix_profiles_rls_recursion`):**
- Dropped all 4 old recursive policies.
- Rewrote `get_my_role()` with `SET search_path = ''` so it genuinely bypasses the caller's RLS context.
- Created 3 clean non-recursive policies:
  - `profiles_select_own` — `id = auth.uid()` only, zero subqueries.
  - `profiles_select_admin` — calls the now-safe `get_my_role()`.
  - `profiles_update_own` — WITH CHECK uses `get_my_role()` instead of a self-referential join.
- Revoked `anon` EXECUTE on `get_my_role()` to close the public RPC security advisory.

---


## Chunk Registry

| Chunk | Title | Status | Depends On |
|-------|-------|--------|------------|
| 1A | Project Scaffold & Folder Structure | ✅ Done | — |
| 1B | Database Schema & Supabase Setup | ✅ Done | 1A |
| 2A | Authentication System (Supabase Auth + RBAC) | ✅ Done | 1B |
| 2B | Middleware & Route Protection | ✅ Done | 2A |
| 3A | Onboarding Core Architecture & Draft System | ✅ Done | 2B |
| 3B | Onboarding Steps 1–3 | ✅ Done | 3A |
| 3C | Onboarding Steps 4–6 | ✅ Done | 3B |
| 3D | Onboarding Review, Payment & Final Submission | ✅ Done | 3C |
| 4A | Admin Dashboard Foundation | ✅ Done | 3D |
| 4B | Admin Dashboard Overview | ✅ Done | 4A |
| 4C | LLC Registrations Listing | ✅ Done | 4B |
| 4D | LLC Registration Details — Customer Information | ✅ Done | 4C |
| 4E | Addons System (Admin) | ✅ Done | 4D |
| 4F | Packages System | ✅ Done | 4E |
| 4G | Users Management System | ✅ Done | 4F |
| 4H | Expenses System | ✅ Done | 4G |
| 4I | PayPal Orders System | ✅ Done | 4H |
| 4J | Invoices System | ✅ Done | 4I |
| 4K | Admin Settings + Permissions | ✅ Done | 4J |
| 4L | Final Polish + Optimization + QA | ⏳ Pending | 4K |
| 5A | Client Dashboard Part 1 | ⏳ Pending | 4L |
| 5B | Client Dashboard Part 2 | ⏳ Pending | 5A |
| 6A | Public Website Pages (Home, About, Services, Blog) | ⏳ Pending | 1A |
| 6B | Public Pages (Legal, Contact, Blog Post) | ⏳ Pending | 6A |
| 7A | Storage Architecture — Hybrid Supabase + Cloudinary | ⏳ Pending | 1B |
| 7B | Keep-Alive Cron, Environment Config & Vercel Deploy | ⏳ Pending | 7A |

---

## Completion Log

- [x] 1A — Project Scaffold & Folder Structure
- [x] 1B — Database Schema & Supabase Setup
- [x] 2A — Authentication System
- [x] 2B — Middleware & Route Protection
- [x] 3A — Onboarding Core Architecture & Draft System
- [x] 3B — Onboarding Steps 1–3
- [x] 3C — Onboarding Steps 4–6
- [x] 3D — Onboarding Review, Payment & Final Submission
- [x] FIX — Onboarding Navigation & Desync Bug
- [x] FIX — Email verification is a sub-step of Account Creation (Step 6)
- [x] 4A — Admin Dashboard Foundation
- [x] 4B — Admin Dashboard Overview
- [x] 4C — LLC Registrations Listing
- [x] 4D — LLC Registration Details — Customer Information
- [x] 4E — Addons System (Admin)
- [x] 4F — Packages System
- [x] 4G — Users Management System
- [x] 4H — Expenses System
- [x] 4I — PayPal Accounts System
- [x] 4J — Invoices System
- [x] 4K — Settings Module (Admin Email/Password Update)
- [ ] 4L — Admin Dashboard Final Chunks

- [ ] 5A–5B — Client Dashboard
- [ ] 6A–6B — Public Pages
- [ ] 7A–7B — Storage & Deployment

---

## Key Conventions

- **Router:** App Router only — NO Pages Router
- **Components:** Server Components by default; `"use client"` only when needed
- **Auth:** `@supabase/ssr` — NO legacy `auth-helpers`
- **Roles:** `administrator` | `manager` | `customer` — stored in `profiles.role`
- **File storage:** >100KB or video → Cloudinary; ≤100KB → Supabase Storage
- **Naming:** `kebab-case` files · `PascalCase` components · `camelCase` functions
- **TypeScript:** Strict mode — no `any`
- **Env prefix:** Public vars use `NEXT_PUBLIC_`
- **UI/UX Rule:** NEVER use `select-none` on data tables, text cards, or accordions. Users must be able to highlight and copy client names, emails, and order numbers.
- **Design System (Capsule-First):** 
  - Main cards & layout containers use `rounded-2xl`. Nested sections scale down to `rounded-xl`. Interactive badges/buttons/dropdowns use `rounded-full`.
  - Borders use `#e0d9f7` for better contrast, avoiding faint grays.
  - Standard shadow token is `shadow-[0_1px_4px_rgba(52,8,143,0.06)]` (subtle purple tint).
  - Open accordions use a subtle tinted header (`bg-[#f4f0fe]`) to establish visual hierarchy.
  - Dropdowns must use `appearance-none` with standard `pr-10` padding and custom SVG chevrons for correct alignment.

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=

# App
NEXT_PUBLIC_APP_URL=
CRON_SECRET=

# Email
RESEND_API_KEY=
```

---

## Admin Module — Established Files & Types (as of 4A)

### Types (`src/types/admin.ts`)
- `AdminRole` — `'administrator' | 'manager'`
- `AdminProfile` — id, email, fullName, role, avatarUrl
- `NavItem` — label, href, icon, badgeKey?
- `BadgeCounts` — llcRegistrations, notifications
- `AdminNotification` / `SafeAdminNotification` — id, title, body, type, link, isRead, createdAt
- `NotificationApiResponse` — count, items

### Server Utilities (`src/lib/admin/`)
- `getAdminUser.ts` — `cache()` wrapped, returns `AdminProfile | null`
- `getUnreadNotifications.ts` — `cache()` + `unstable_cache` (30s)
- `getUnreadOrderCount.ts` — `cache()` + `unstable_cache` (60s)
- `adminNavConfig.ts` — `NAV_ITEMS: NavItem[]`

### Client Utilities (`src/lib/admin/`)
- `notificationCache.ts` — sessionStorage/localStorage helpers (CLIENT-ONLY)
  - `getNotifCache()`, `setNotifCache()`, `isNotifCacheStale()`, `clearNotifCache()`
  - `getSidebarCollapsed()`, `setSidebarCollapsed()`

### Server Actions (`src/lib/admin/actions/`)
- `refreshAdmin.ts` — `refreshAdminData(adminId)` — revalidates all admin tags
- `markNotificationsRead.ts` — marks notifications read + revalidates tags

### API Routes
- `GET /api/admin/notifications` — sanitized list, Cache-Control: private max-age=30

### Components (`src/components/admin/`)
- `AdminShell` — layout wrapper (Server)
- `AdminSidebar` — collapsible, localStorage for pref (Client)
- `AdminHeader` — refresh / notifications / sign-out (Server + Client children)
- `NotificationDropdown` — sessionStorage-cached fetch (Client)
- `SidebarNavItem` — active state via usePathname (Client)
- `SidebarBadge` — unread count pill
- `AdminBreadcrumb` — breadcrumb for content area

---

## Overview Module — Established Files & Types (as of 4B)

### New Types added to `src/types/admin.ts`
- `DateRangeFilter` — `'today' | 'yesterday' | '7d' | '14d' | '30d' | '60d' | '90d'`
- `DateRange` — label, key, startDate() factory, endDate() factory
- `LlcStats` — total, pending, processing, completed
- `PaypalStats` — total, pending, processing, completed
- `EarningsBreakdown` — llcRevenue, paypalRevenue, invoiceCommissions, totalEarnings, llcPercent, paypalPercent, invoicePercent
- `OverviewStats` — llc, paypal, earnings, rangeKey, fetchedAt

### Server Utilities added
- `lib/admin/getOverviewStats.ts` — `cache()` + `unstable_cache` (120s), parallel queries
- `lib/admin/dateRanges.ts` — `DATE_RANGES: DateRange[]` (7 presets, date-fns)
- `lib/admin/statusColors.ts` — `STATUS_COLORS` typed constant
- `lib/admin/formatters.ts` — `formatPKR`, `formatCompact`, `timeAgo`

### Server Actions added
- `lib/admin/actions/revalidateOverview.ts` — busts overview-stats + overview-earnings tags
- `lib/admin/actions/refreshAdmin.ts` — MODIFIED: now also busts overview tags

### Components added
- `overview/_components/OverviewFilters.tsx` — Client, URL nav controller only
- `overview/_components/StatCard.tsx` — Server, pure display
- `overview/_components/EarningsCard.tsx` — Server wrapper
- `overview/_components/EarningsBar.tsx` — Client, mount animation
- `overview/_components/SubStatRow.tsx` — Server

### DB Objects added (Chunk 4B)
- VIEW: `public.admin_overview_stats`
- INDEX: `orders_created_at_brin`
- INDEX: `orders_type_status`
- INDEX: `orders_type_payment_status`

### Caching additions (Chunk 4B)
- TTL 120s: `overview-stats`, `overview-stats-{rangeKey}`, `overview-earnings`

### Allowed sessionStorage keys (updated)
- `fm_admin_notif_cache` (4A)
- `fm_admin_badge_count` (4A)
- `fm_admin_overview_filter` **(NEW 4B)** — active date filter string

### Reusable across future chunks
- `STATUS_COLORS` — use in 4C order badges, 4D/4E detail pages
- `formatPKR` / `formatCompact` — use in 4C list, 4F financial system
- `DATE_RANGES` — reuse in 4C order list date filters
- `StatCard` — potentially reuse in other summary sections

---

### Database Changes (Chunk 4A)
- NEW: `public.admin_order_views` (admin_id, order_id, viewed timestamps, RLS)
- MODIFIED: `public.orders` (+order_number TEXT, sequence FM-XXXXX, backfilled)
- RLS policies: admin SELECT on orders, profiles, companies, notifications, documents, audit_logs

---

## LLC Registrations Module — Established Files & Types (as of 4C)

### New Types added to `src/types/admin.ts`
- `LlcOrderStatus` — `'pending' | 'processing' | 'formed' | 'cancelled'`
- `PaymentStatus` — `'unpaid' | 'paid' | 'partial'`
- `SortDirection` — `'asc' | 'desc'`
- `LlcSortField` — `'created_at' | 'order_number' | 'grand_total'`
- `LlcOrderRow` — strict schema with unread views status and payment amount calculation
- `LlcTopStats` — total, pending, processing, formed
- `LlcListFilters` — schema for query strings, status, date, page, pagesize, sorting controls
- `LlcListResult` — orders, count, total pages, stats

### Server Utilities added (Chunk 4C)
- `lib/admin/getLlcOrders.ts` — 60s unstable_cache with direct search query bypass on full-text index
- `lib/admin/getLlcOrderStats.ts` — dynamic status count aggregator wrapped in 60s cache
- `lib/admin/formatters.ts` — MODIFIED: `formatLlcName`, `formatDate`

### Server Actions added (Chunk 4C)
- `lib/admin/actions/revalidateLlcList.ts` — busts order-list-llc + order-list-llc-stats tags
- `lib/admin/actions/refreshAdmin.ts` — MODIFIED: now also busts LLC order list tags

### Components added (Chunk 4C)
- `llc-registrations/_components/LlcListTopStats.tsx` — Server Link navigation pills
- `llc-registrations/_components/LlcListControls.tsx` — Client filters & debounced query spinner
- `llc-registrations/_components/LlcOrderTable.tsx` — Responsive grid table coordinator
- `llc-registrations/_components/LlcOrderRow.tsx` — Desktop grid line items
- `llc-registrations/_components/LlcOrderCard.tsx` — Mobile stacked cards
- `llc-registrations/_components/LlcStatusBadge.tsx` — Bordered status chips
- `llc-registrations/_components/LlcNewBadge.tsx` — Admin viewed tracking indicator
- `llc-registrations/_components/LlcEmptyState.tsx` — Empty analytics and search results layouts
- `llc-registrations/_components/LlcPagination.tsx` — Client navigation page selector
- `llc-registrations/loading.tsx` — High fidelity custom page skeletons

### DB Changes applied (Chunk 4C)
- COLUMN: generated `search_vector` on `public.orders` using Postgres `tsvector`
- GIN INDEX: `orders_search_vector_idx` on `search_vector`
- GIN INDEX: `orders_form_snapshot_gin` on `form_snapshot` (`jsonb_path_ops`)
- INDEX: partial B-Tree sorting index `orders_llc_created` on `public.orders`

### Allowed sessionStorage keys (updated)
- `fm_admin_notif_cache` (4A)
- `fm_admin_badge_count` (4A)
- `fm_admin_overview_filter` (4B)
- `fm_admin_llc_pagesize` (NEW 4C) — active page size selector (10, 25, 50)

---

## LLC Registration Detail Module — Established Files & Types (as of 4D)

### New Types added to `src/types/admin.ts`
- `LlcOrderDetail` — full order detail including form_snapshot, pricing, payment, status history
- `OrderStatusHistory` — id, changedBy, oldStatus, newStatus, note, changedAt
- `DocumentResubmissionRequest` — id, fieldName, status, note, requestedAt, resolvedAt
- `OrderInternalAddon` — id, addonId, addonName, addonPrice, description, assignedAt

### Server Utilities added (Chunk 4D)
- `lib/admin/getLlcOrderDetail.ts` — `cache()` + `unstable_cache` (60s), full join query
- `lib/admin/getLlcOrderDocuments.ts` — fetches documents for order + member slots

### Server Actions added (Chunk 4D)
- `lib/admin/actions/updateOrderStatus.ts` — status change + history insert + revalidation
- `lib/admin/actions/requestDocumentResubmission.ts` — inserts resubmission request
- `lib/admin/actions/assignOrderToManager.ts` — assigns order + revalidates

### Components added (Chunk 4D)
- `llc-registrations/[id]/_components/OrderDetailHeader.tsx` — breadcrumb + status badge + quick actions
- `llc-registrations/[id]/_components/CustomerInfoCard.tsx` — profile snapshot accordion
- `llc-registrations/[id]/_components/CompanyInfoCard.tsx` — LLC formation data accordion
- `llc-registrations/[id]/_components/MembersCard.tsx` — members/managers list
- `llc-registrations/[id]/_components/DocumentsCard.tsx` — doc slots with resubmission triggers
- `llc-registrations/[id]/_components/PricingCard.tsx` — package, addons, totals
- `llc-registrations/[id]/_components/StatusHistoryCard.tsx` — timeline of status changes
- `llc-registrations/[id]/_components/StatusChangeModal.tsx` — Client modal for status update

---

## Addons System — Established Files & Types (as of 4E)

### DB Changes applied (Chunk 4E)
- NEW TABLE: `public.addon_categories` — id, name, sort_order, created_at
- NEW TABLE: `public.addons` — id, name, price, category_ids (uuid[]), features (text[]), status (draft|published), sort_order, created_at, updated_at
- RLS: admin full CRUD on both tables; public SELECT on published addons only

### New Types added to `src/types/admin.ts`
- `AddonStatus` — `'draft' | 'published'`
- `AddonCategory` — id, name, sortOrder, createdAt
- `Addon` — id, name, price, categoryIds, features, status, sortOrder, createdAt, updatedAt

### Server Utilities added (Chunk 4E)
- `lib/admin/getAddons.ts` — `unstable_cache` 600s, tag `addons`
- `lib/admin/getAddonCategories.ts` — `unstable_cache` 600s, tag `addon-categories`

### Server Actions added (Chunk 4E)
- `lib/admin/actions/addonActions.ts` — createAddon, updateAddon, deleteAddon, createAddonCategory, deleteAddonCategory + revalidateTag('addons')

### Components added (Chunk 4E)
- `addons/_components/AddonCategoryTabs.tsx` — Client, filter tabs by category
- `addons/_components/AddonCard.tsx` — Server, capsule card with edit/delete icons
- `addons/_components/AddonFeatureList.tsx` — Server, styled bullet list
- `addons/_components/AddonModal.tsx` — Client, create/edit modal with multi-select categories
- `addons/_components/AddonCategoryModal.tsx` — Client, create category modal
- `addons/_components/AddonDeleteConfirm.tsx` — Client, confirm delete dialog
- `addons/page.tsx` — Server page, category tabs + addon grid layout
- `addons/loading.tsx` — Skeleton loader

### Revalidation tags (Chunk 4E)
- `addons` — all addon list queries
- `addon-categories` — category list queries

---

## Packages System — Established Files & Types (as of 4F)

### DB Changes applied (Chunk 4F)
- NEW TABLE: `public.packages` — id, name, price, features (text[]), status (draft|published), sort_order, created_at, updated_at
- RLS: admin full CRUD; public SELECT on published packages only

### New Types added to `src/types/admin.ts`
- `PackageStatus` — `'draft' | 'published'`
- `Package` — id, name, price, features, status, sortOrder, createdAt, updatedAt

### Server Utilities added (Chunk 4F)
- `lib/admin/getPackages.ts` — `unstable_cache` 600s, tag `packages`

### Server Actions added (Chunk 4F)
- `lib/admin/actions/packageActions.ts` — createPackage, updatePackage, deletePackage + revalidateTag('packages')

### Components added (Chunk 4F)
- `packages/_components/PackageCard.tsx` — Server, capsule card with edit/delete icons
- `packages/_components/PackageFeatureList.tsx` — Server, styled bullet list
- `packages/_components/PackageModal.tsx` — Client, create/edit modal
- `packages/_components/PackageDeleteConfirm.tsx` — Client, confirm delete dialog
- `packages/_components/PackageStatusBadge.tsx` — Server, draft/published pill
- `packages/page.tsx` — Server page, status filter tabs + package grid
- `packages/loading.tsx` — Skeleton loader

### Revalidation tags (Chunk 4F)
- `packages` — all package list queries

---

## Next.js 16 + React 19 Stability & Serialization Fixes (2026-05-18)

### 1. Server → Client Serialization Fixes

#### Root Cause:
Next.js throws `"Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with 'use server'"` when a Server Component passes props that contain function references across the server-client boundary.

#### Fix & Architectural Decision:
- **Pruned Props Boundary:** Pass only serializable UI properties (label, key) to Client Components. Keep factory functions server-side only.
- **Pruned Component Prop Type:** Adjust prop types to require `SerializableDateRange[]` instead of `DateRange[]`.

---

### 2. Maximum Update Depth Exceeded (Infinite Render Loop)

#### Fix & Architectural Decision:
- **Stable Callback Reference:** Wrap callbacks passed to child components in `useCallback` with empty dependency array.
- **Bailout State Syncing:** Check if new value equals current state before updating; return previous state reference if identical.

---

### Preventative Guidelines for Next.js 16 + React 19 Boundaries:

1. **Rule of Clean Props:** NEVER pass functions containing objects as props from Server to Client Components.
2. **Rule of Callback Stability:** Any state setter callback passed to an interactive child MUST be wrapped in `useCallback`.
3. **Rule of Bailout Check:** Always include value-comparison before committing state modifications.

---

## 🎨 Premium Capsule & Rounded Layout Aesthetics (2026-05-18)

### Layout Upgrades Applied:
1. **Sidebar Navigation Elements** — Capsule active states (`rounded-full mx-1.5 px-4 py-2.5`)
2. **Structural Content Blocks** — Modern curved cards (`rounded-2xl`)
3. **Pills & Select Filters** — Highly interactive capsules (`rounded-full px-4 py-2`)
4. **Header Shell Controls** — Fully rounded (`rounded-full`)
5. **Form Controls & Inputs** — Sleek capsules (`rounded-full pl-10 pr-10`)
6. **Pagination Controls** — Capsule page pills (`rounded-full`)

---

## 🐛 Bug Fix Session (2026-05-18) — Three Admin Dashboard Issues

### Issue 1 — LLC Registrations List Empty Despite Badge Count Showing 1
- **Fix:** `.ilike('order_type', '%llc%')` everywhere instead of `.eq('order_type', 'llc')`

### Issue 2 — MarkAsViewedTrigger Import / JSX Component Error
- **Fix:** Remove `: null` return type annotation; React 19 rejects it. Omit or use `React.ReactNode`.

### Issue 3 — Collapsed Sidebar SVG Icon Misalignment
- **Fix:** `justify-center px-0` when collapsed; `px-4` when expanded.

---

## Invoices System — Established Files & Types (as of 4J)

### DB Changes applied (Chunk 4J)
- NEW SEQUENCE: `public.invoice_number_seq`
- NEW TABLE: `public.invoices` — id, invoice_number (INV-XXXXX format), date, name, total_amount_pkr, commission_earned, notes, created_by, created_at, updated_at
- RLS: full read/write access allowed for authenticated administrators and managers.

### New Types added to `src/types/admin.ts`
- `Invoice` — core invoice details
- `InvoiceFilters` — query, date range filters
- `InvoiceListResult` — invoices, count, total pages
- `InvoiceStats` — total count, total revenue, commission, and current month count

### Server Utilities added (Chunk 4J)
- `src/lib/admin/getInvoices.ts` — `unstable_cache` 60s, tag `invoice-list`
- `src/lib/admin/getInvoiceStats.ts` — `unstable_cache` 60s, tag `invoice-list`

### Server Actions added (Chunk 4J)
- `src/lib/admin/actions/invoiceActions.ts` — createInvoice, updateInvoice, deleteInvoice

### Components added (Chunk 4J)
- `invoices/_components/InvoiceStatsCards.tsx` — Server, KPIs
- `invoices/_components/InvoiceListControls.tsx` — Client, search & date filters
- `invoices/_components/InvoiceTable.tsx` / `InvoiceRow.tsx` — Responsive layout displays
- `invoices/_components/InvoiceActionMenu.tsx` — Client dropdown with edit/delete checks
- `invoices/_components/InvoiceModal.tsx` — Create/Edit input fields
- `invoices/_components/InvoiceDeleteConfirm.tsx` — Confirm delete modal
- `invoices/_components/InvoiceCreateButton.tsx` — Opens create modal
- `invoices/_components/InvoicePagination.tsx` — Client page controls
- `invoices/_components/InvoiceEmptyState.tsx` — Zero state message
- `invoices/page.tsx` — Core server coordinator
- `invoices/loading.tsx` — Skeleton UI loader

---

## CHUNK 4E — Addons System ✅ COMPLETED

### New Tables
- `public.addon_categories` — id, name, created_at. RLS: admin/manager.
- `public.addons` — id, name, price, features (text[]), status (draft|published), created_at, updated_at. RLS: admin/manager.
- `public.addon_category_map` — addon_id FK, category_id FK. Composite PK. CASCADE delete. Many-to-many join.

### New Types (src/types/admin.ts)
- `AddonCategory` — id, name, createdAt
- `AddonStatus` — 'draft' | 'published'
- `Addon` — id, name, price, features[], status, categories[], createdAt, updatedAt
- `AddonFilters` — categoryId, status, search
- `AddonFormData` — name, price, featuresRaw, status, categoryIds[]

### New Files
- `src/app/admin/addons/page.tsx` — Server, revalidate 120s
- `src/app/admin/addons/loading.tsx`
- `src/app/admin/addons/_components/AddonCategoryTabs.tsx` — Client, scrollable pill tabs
- `src/app/admin/addons/_components/AddonListControls.tsx` — Client, search + status
- `src/app/admin/addons/_components/AddonCardGrid.tsx` — Server grid
- `src/app/admin/addons/_components/AddonCard.tsx` — Server card
- `src/app/admin/addons/_components/AddonStatusBadge.tsx` — Server badge
- `src/app/admin/addons/_components/AddonFeatureList.tsx` — Server bullet list
- `src/app/admin/addons/_components/AddonCardActions.tsx` — Client island (edit/delete icons)
- `src/app/admin/addons/_components/AddonModal.tsx` — Client, create + edit
- `src/app/admin/addons/_components/AddonDeleteConfirm.tsx` — Client, delete confirm
- `src/app/admin/addons/_components/AddonCategoryModal.tsx` — Client, full category CRUD
- `src/app/admin/addons/_components/AddonEmptyState.tsx` — Server
- `src/app/admin/addons/_components/AddonActionButtons.tsx` — Client buttons wrapper

### Server Utilities
- `src/lib/admin/getAddons.ts` — cache 120s, tag addon-list
- `src/lib/admin/getAddonCategories.ts` — cache 300s, tag addon-categories

### Server Actions
- `src/lib/admin/actions/addonActions.ts`
  - createAddon, updateAddon, deleteAddon
  - createAddonCategory, updateAddonCategory, deleteAddonCategory

### Key Patterns
- Features: textarea (newline-separated) → string[] on save; string[].join('\n') on edit prefill
- Categories: multi-select checkboxes (NOT native select)
- Category filter: client-side JS filter after join resolve
- Category CRUD: all in one AddonCategoryModal (inline edit/delete per row)
- Render Bug Fix: extracted Client Button Modals from `page.tsx` to `AddonActionButtons.tsx` to prevent breaking Server Component serialization limits.

### Cache Tags
- `addon-list` — TTL 120s
- `addon-categories` — TTL 300s

---

## CHUNK 4H — Expenses System ✅ COMPLETED

### New Tables
- `public.expense_categories` — id, name, icon (text/Lucide name), color (hex), created_at. RLS: admin/manager.
  - Seeded with 7 default categories: Office Supplies, Software, Marketing, Utilities, Travel, Payroll, Miscellaneous
- `public.expenses` — id, category_id (FK→expense_categories), description, date (date), amount, created_by, created_at, updated_at. RLS: admin/manager.

### New Types (src/types/admin.ts)
- `ExpenseCategory` — id, name, icon, color, createdAt
- `Expense` — id, categoryId, categoryName, categoryIcon, categoryColor, description, date, amount, createdBy, createdAt, updatedAt
- `ExpenseDateRange` — 'today'|'yesterday'|'7d'|'14d'|'30d'|'60d'|'90d'|'all'
- `ExpenseFilters` — categoryId, dateRange, search, page, pageSize
- `ExpenseListResult` — expenses[], total, totalPages
- `ExpenseStats` — totalExpenses, totalAmount, byCategory[]

### Icon Strategy
- Category icons stored as Lucide icon name strings
- Server Components use ICON_EMOJI_MAP for rendering (no dynamic imports)
- Client Components may use Lucide icon map directly

### Date Filter
- Pill-based (not select) — 8 options including today/yesterday
- Filters on `date` column (not created_at)

### Category Delete Rule
- FK constraint blocks delete if expenses exist; catch error code '23503', return friendly message

### New Files
- `src/app/admin/expenses/page.tsx` — Server, revalidate 60s
- `src/app/admin/expenses/loading.tsx`
- `src/app/admin/expenses/_components/ExpenseStatsCards.tsx`
- `src/app/admin/expenses/_components/ExpenseTable.tsx`
- `src/app/admin/expenses/_components/ExpenseRow.tsx`
- `src/app/admin/expenses/_components/ExpenseCategoryBadge.tsx`
- `src/app/admin/expenses/_components/ExpenseDateFilter.tsx` — Client, pill group
- `src/app/admin/expenses/_components/ExpenseListControls.tsx` — Client
- `src/app/admin/expenses/_components/ExpenseActionMenu.tsx` — Client island
- `src/app/admin/expenses/_components/ExpenseModal.tsx` — Client
- `src/app/admin/expenses/_components/ExpenseDeleteConfirm.tsx` — Client
- `src/app/admin/expenses/_components/ExpenseCategoryModal.tsx` — Client, full CRUD
- `src/app/admin/expenses/_components/ExpenseEmptyState.tsx` — Server
- `src/app/admin/expenses/_components/ExpensePagination.tsx` — Client
- `src/lib/admin/getExpenses.ts` — cache 60s, tag expense-list
- `src/lib/admin/getExpenseCategories.ts` — cache 300s, tag expense-categories
- `src/lib/admin/getExpenseStats.ts` — cache 60s, tag expense-list
- `src/lib/admin/actions/expenseActions.ts`

### Cache Tags
- `expense-list` — TTL 60s
- `expense-categories` — TTL 300s

---

## CHUNK 4K — Settings Module ✅ COMPLETED

### No New Tables
- Operates on existing auth.users and public.profiles only

### New Types (src/types/admin.ts)
- `AdminProfile` — id, email, fullName, phone, role, avatarUrl, isActive, createdAt
- `UpdateEmailResult` — error?, requiresReLogin?
- `UpdatePasswordResult` — error?, requiresReLogin?

### New Files
- `src/app/admin/(dashboard)/settings/page.tsx` — Server, force-dynamic (never cached)
- `src/app/admin/(dashboard)/settings/loading.tsx`
- `src/app/admin/(dashboard)/settings/_components/SettingsProfileCard.tsx` — Server, read-only profile display
- `src/app/admin/(dashboard)/settings/_components/SettingsEmailForm.tsx` — Client, email update + signout
- `src/app/admin/(dashboard)/settings/_components/SettingsPasswordForm.tsx` — Client, password update + strength indicator + signout
- `src/app/admin/(dashboard)/settings/_components/SettingsDangerZone.tsx` — Client, force logout trigger
- `src/app/admin/(dashboard)/settings/_components/SettingsLogoutConfirm.tsx` — Client, global signout confirm modal
- `src/lib/admin/getCurrentAdminProfile.ts` — React cache only, no unstable_cache
- `src/lib/admin/actions/settingsActions.ts` — updateAdminEmail, updateAdminPassword, forceLogoutAllSessions

### Security Rules
- Email change requires current password confirmation
- Password change requires current password confirmation
- Both changes call adminClient.auth.admin.signOut(userId, 'global') to revoke all sessions
- Client-side then calls supabase.auth.signOut() + router.push('/sign-in')
- No email_confirm bypass on admin email update

### Access Control
- Only administrator role can access /admin/settings
- Non-administrators see access denied card (not redirect)

### Key Patterns
- force-dynamic: settings page never cached
- Password strength: client-side only (weak/fair/strong bar)
- requiresReLogin pattern: action returns flag → client waits 2s → signOut → redirect
- global signOut: invalidates all refresh tokens across all devices