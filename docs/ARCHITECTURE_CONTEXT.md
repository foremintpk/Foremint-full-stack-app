# Architecture Context

**Status:** Living document. Update this file whenever an architecture-affecting change is made.
**Last updated:** 2026-06-07
**Audit basis:** Stages 2A, 3, 4, 5B, 5C, 6

---

## Section 1 — High Level System Overview

### Framework

- **Next.js 16** (not 15). File-based routing. Server Components by default.
- Request interception file is `src/proxy.ts` (named export `proxy`). This is **not** `middleware.ts`. The name change is a Next.js 16 breaking change.
- Server Actions use `'use server'` directive. They require the Next.js HMAC action ID in the request header, providing built-in CSRF protection.
- `src/lib/middleware.ts` exists but is **dead code** — Supabase SSR boilerplate that is never imported or executed.

### Authentication Provider

- **Supabase Auth** (hosted GoTrue)
- Two identity resolution methods in use:
  - `supabase.auth.getUser()` — live network call to Supabase Auth server. Detects revoked tokens, expired sessions, banned users. Slower.
  - `supabase.auth.getClaims()` — local JWT verification using cached JWKS. No network call. Cannot detect revocation. Fast.
- Session cookies are `sb-*` prefixed, managed by the `@supabase/ssr` package.
- The `createMiddlewareClient()` function (used in `proxy.ts`) refreshes the session cookie on every qualifying request.

### Authorization Model

Two-phase per request:

1. **Identity**: Who is this user? (`getClaims()` → `claims.sub`)
2. **Authorization**: What are they allowed to do? (fresh DB query → `profiles.role` + `profiles.is_active`)

Authorization is **never** derived from the JWT alone. Role and active-status always come from a live database query at the time of the action.

### Database

- **Supabase Postgres** (hosted)
- Row-Level Security (RLS) is enabled on all user-facing tables.
- `public.profiles` table is the authorization source of truth. Contains `role` (enum: `administrator`, `manager`, `customer`, `b2b_customer`) and `is_active` (boolean).
- `public.get_my_role()` is a SECURITY DEFINER RPC function (see Section 10).
- Admin mutations use `createAdminClient()` (service role key, bypasses RLS) for write operations that require bypassing RLS.
- User-scoped reads use the SSR client (anon key + session cookies) so RLS is enforced.

### Storage Providers

- **Cloudinary** — primary storage for documents > 100KB, member passport photos, payment receipts. Used directly in document upload routes.
- **Supabase Storage** — fallback for documents ≤ 100KB. Bucket: `onboarding-documents`.

### Payment Providers

- No Stripe integration active. `simulateStripePayment()` in `src/lib/dashboard/actions.ts` is a placeholder that marks payment status as `paid`.
- Bank transfer receipts are uploaded manually via `submitBankTransferReceipt()`.

### Background Jobs

- **Vercel Cron** calls `GET /api/keep-alive` every 3 days. Protected by `Authorization: Bearer CRON_SECRET` header check. Prevents Supabase free-tier project pausing.

### Cache System

Three layers in use:

| Layer | Mechanism | TTL | Scope |
|-------|-----------|-----|-------|
| L1 | `unstable_cache` (Next.js) | 30–60s | Per cache tag, server-wide |
| L2 | `React.cache()` | Per request | Request-scoped deduplication |
| L3 | Next.js Full Route Cache | 60s | Layouts with `export const revalidate = 60` |

Cache invalidation uses `revalidateTag(tag, 'max')`. Tag-naming convention: `order-{id}`, `notif-count-{adminId}`, `notif-list-{adminId}`, `unread-orders-{adminId}`, `nav-badges-{adminId}`, `customer-dashboard-{userId}`, `llc-detail-{orderId}`.

### Notification System

- **Admin notifications**: `public.notifications` table, rows targeted by `recipient_id` (specific admin) or `target_role` (all admins or all managers).
- **Customer notifications**: Same table filtered by `recipient_id`.
- Admin unread count/list fetched via `getCachedUnreadNotifications()` (L1 cache, 30s TTL).
- Admin badge counts refreshed via realtime subscription in `AdminShell` component.
- Notification marking uses server-derived identity — `markAllNotificationsRead()` ignores client-supplied `adminId`/`adminRole` parameters.

### Request Flow

```
Browser request
  ↓
proxy.ts (Next.js 16 proxy function)
  ├─ /_next/*, /api/*, /auth/*, static files → NextResponse.next() [NO auth]
  ├─ PUBLIC_ROUTES (/, /about, /services, etc.) → NextResponse.next() [NO auth]
  ├─ SERVER_GUARDED_ROUTES (/login, /register, etc.) → NextResponse.next() [NO auth]
  ├─ /onboarding/* → getUser() → if admin role: redirect /admin
  ├─ /dashboard/* → getUser() → if no user: redirect /login
  ├─ /company, /documents, /orders, etc. → getUser() → if no user: redirect /login
  └─ /admin/* → getUser() → if no user: redirect /login
                           → getUserRole() [profiles.role only] → if not admin/manager: redirect /dashboard
                           → allow request
  ↓
Server Component / Layout
  ├─ admin/layout.tsx → getAdminUser() [getClaims + profiles.role + profiles.is_active]
  │     └─ null → redirect /sign-in
  ├─ admin/(dashboard)/layout.tsx → getAdminUser() [React cache dedupe]
  │     └─ null → redirect /sign-in
  └─ dashboard/layout.tsx → getSession() [getClaims + profiles.*]
        └─ throws → redirect /login
  ↓
Page / Server Action
  ├─ Admin actions → independent auth: getClaims() → profiles.role + profiles.is_active
  └─ Dashboard actions → getSession() → ownership check (session.user.id === param.userId)
```

---

## Section 2 — Trust Boundaries

### Boundary 1 — Proxy Perimeter (Admin/Dashboard/Onboarding Pages)

**File:** `src/proxy.ts`
**Function:** `proxy()`, line 79: `supabase.auth.getUser()`
**Route coverage:** All non-API, non-static, non-public routes
**Excluded:** `/api/*`, `/_next/*`, `/auth/*`, static files (`.ext` pattern)

**Why it exists:** This is the revocation-detection perimeter. `getUser()` makes a live network call to Supabase Auth, which verifies that the session token is still valid AND that the refresh token has not been revoked. It detects:
- Explicitly revoked sessions (via admin `signOut(userId, 'global')`)
- Banned users (`ban_duration` set)
- Expired sessions

**Security guarantee:** No request to a protected page reaches its handler if the session has been revoked at the Supabase Auth level, regardless of whether the JWT has expired.

**What must never be changed:**
- The `getUser()` call at line 79 **must remain `getUser()`**. It must never be replaced with `getClaims()`.
- If replaced with `getClaims()`, revoked sessions would pass the perimeter until their JWT expires (up to 1 hour after revocation).

**Known gap:** `getUserRole()` selects only `profiles.role`, not `profiles.is_active`. An inactive admin with a valid session passes the proxy. They are stopped by `getAdminUser()` in the admin layout (which enforces `is_active`). This is defense-in-depth: the perimeter checks liveness; the layout checks administrative status.

**What must never be removed:** The `getUser()` call is the only revocation-detection layer for page routes. Downstream code uses `getClaims()` which cannot detect revocation.

---

### Boundary 2 — Admin Layout Gate

**Files:** `src/app/admin/layout.tsx`, `src/app/admin/(dashboard)/layout.tsx`
**Function:** `getAdminUser()` (React `cache()`-wrapped)

**Why it exists:** The proxy enforces session liveness but not administrative active-status. The admin layout is the second gate that enforces `profiles.is_active = true`. Both layouts call `getAdminUser()` — React's `cache()` deduplicates the call within one request.

**Security guarantee:** An inactive admin who passes the proxy is redirected to `/sign-in` before any admin page content renders.

**What must never be changed:** Both layout files must call `getAdminUser()` and redirect on null. Removing either call removes the `is_active` enforcement layer for admin page routes.

---

### Boundary 3 — Server Action Authorization (per-action self-protection)

**Files:** All `src/lib/admin/actions/*.ts` files
**Pattern:** Each action independently verifies identity and authorization.

**Why it exists:** Server Actions are invokable directly (not just via navigation), so each one must be self-protecting regardless of what route called it.

**Security guarantee:** Authorization cannot be bypassed by crafting a direct Server Action call. Each action performs: `getClaims()` → `profiles.role + profiles.is_active` → allow/deny.

**What must never be changed:** The authorization check at the top of each action. Inline guards must not be removed under the assumption that "the layout already checked."

---

### Boundary 4 — API Route Self-Protection

**Scope:** All `src/app/api/admin/*` routes
**Why it exists:** The proxy explicitly skips all `/api/*` paths (`pathname.startsWith("/api/")` → `NextResponse.next()`). Each API route is its own trust boundary.

**Security guarantee:** Each admin API route independently verifies identity and authorization before executing.

**What must never be changed:** Admin API routes must never remove their internal auth checks under the assumption that the proxy handles it. The proxy does not handle it for `/api/*`.

---

### Boundary 5 — RPC Authorization (Database Layer)

**Function:** `public.get_my_role()` in Supabase Postgres
**Purpose:** Returns the calling user's role IF and ONLY IF `profiles.is_active = true`. Returns NULL otherwise.

**Current definition (post Stage 5C migration):**
```sql
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT role FROM public.profiles
  WHERE id = auth.uid()
    AND is_active = true;
$function$;
```

**Why it exists:** 21 call sites across 18 Server Action files and 3 API route handlers use this function for authorization. Enforcing `is_active` at the DB level provides a single point of enforcement for all RPC-based authorization.

**Security guarantee:** Even if application code forgets to check `is_active`, the database function returns NULL for inactive users, causing all callers' role-equality checks to fail.

**What must never be changed:** The `AND is_active = true` predicate must never be removed. If the function is recreated or migrated, it must preserve this predicate.

---

## Section 3 — Authentication Architecture

### `supabase.auth.getUser()` Usage Inventory

| File | Context | Classification | Why |
|------|---------|----------------|-----|
| `src/proxy.ts:79` | Request perimeter | **MUST_REMAIN `getUser()`** | Only revocation-detection layer for page routes |
| `src/app/api/documents/[docId]/view/route.ts:32` | API route self-boundary | **MUST_REMAIN `getUser()`** | `/api/*` bypasses proxy; this route is its own perimeter |
| `src/app/auth/callback/route.ts:20` | Post-code-exchange identity | **SAFE_TO_REPLACE with getClaims()** | Just exchanged code; session is fresh; revocation not a concern here |
| `src/lib/admin/actions/backfillOrderCompanies.ts:54` | Server Action identity | **SAFE_TO_REPLACE with getClaims()** | More secure than needed; `getClaims()` is the established pattern for actions behind the proxy perimeter |
| `src/components/onboarding/steps/step-7.tsx:65` | Browser client component | N/A — browser client | Not a server-side concern |
| `src/app/onboarding/_components/account/EmailVerificationPrompt.tsx:66` | Browser client component | N/A — browser client | Not a server-side concern |

### `supabase.auth.getClaims()` Usage Inventory

Used by all admin Server Actions and most API routes (except those noted above as `getUser()`). Pattern:

```ts
const { data: claimsData, error } = await supabase.auth.getClaims();
const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;
if (!user) return { error: 'Unauthorized' };
```

**Note:** `claims.sub` is the user-id-equivalent in `JwtPayload`. There is no `.id` field on claims. In `get-session.ts`, `claims.sub` is mapped to `.id` for the returned `User` shape.

**Classification:** SAFE for all downstream code that runs behind the proxy perimeter. The proxy's `getUser()` already validated the session before the action reached this point.

### `getSession()` / `getSessionSafe()`

**File:** `src/lib/auth/get-session.ts`

```
getSession() [React cache()-wrapped]
  → getClaims() → claims.sub → user object
  → profiles.* (select *) → full profile row
  → returns { user, profile }
  → throws if unauthenticated

getSessionSafe()
  → wraps getSession() with try/catch
  → returns null instead of throwing
```

**Used by:**
- `getAdminUser()` via `getSessionSafe()`
- `dashboard/layout.tsx` via `getSession()`
- `dashboard/actions.ts` via `getSession()`

**Profile includes:** All columns via `select("*")`, so `is_active` is always present in the returned profile.

**Classification:** SAFE. Uses `getClaims()` internally. Runs behind proxy perimeter for all current callers.

### `getAdminUser()`

**File:** `src/lib/admin/getAdminUser.ts`

```
getAdminUser() [React cache()-wrapped]
  → getSessionSafe()
      → getSession()
          → getClaims() → claims.sub
          → profiles.* (select *)
  → profile.role NOT IN ('administrator', 'manager') → return null
  → profile.is_active !== true → return null
  → return AdminProfile
```

**Used by:**
- `src/app/admin/layout.tsx`
- `src/app/admin/(dashboard)/layout.tsx`
- `src/app/api/admin/config/addons/route.ts`
- `src/app/api/admin/config/plans/route.ts`
- `src/app/api/admin/users/search/route.ts`
- `src/lib/admin/actions/getAdminBadgeCounts.ts`

**Classification:** MUST_REMAIN. The `is_active` enforcement at this level protects all admin layouts and three API routes.

### `getCurrentAdminProfile()`

**File:** `src/lib/admin/getCurrentAdminProfile.ts`

```
getCurrentAdminProfile() [React cache()-wrapped]
  → getClaims() → claims.sub
  → profiles.id, email, full_name, phone, role, avatar_url, is_active, created_at
  → return AdminProfile (includes isActive field)
  → does NOT enforce role or is_active — callers must do this
```

**Callers:** `src/lib/admin/actions/settingsActions.ts` (3 call sites, each checks `!admin || admin.isActive !== true || admin.role !== 'administrator'`).

**Classification:** SAFE. Fetches `is_active` but does not enforce it. Enforcement is caller responsibility. Currently all callers enforce it.

---

## Section 4 — Authorization Architecture

### Pattern A — `verifyAdminRole()` helper (4 files)

Used in: `userActions.ts`, `couponActions.ts`, `packageActions.ts`, `b2bCustomerActions.ts`

```ts
async function verifyAdminRole() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || profile.is_active !== true || profile.role !== 'administrator') {
    throw new Error('Only administrators are authorized to perform user management actions.');
  }

  return { supabase, actorId: user.id };
}
```

**Roles allowed:** `administrator` only
**is_active enforced:** ✅ Yes
**Identity source:** `getClaims()` → `claims.sub`

---

### Pattern B — `verifyRole(allowedRoles)` helper (2 files)

Used in: `paypalOrderActions.ts`, `invoiceActions.ts`

```ts
async function verifyRole(allowedRoles: ('administrator' | 'manager')[]) {
  // ... getClaims() → profiles.role + profiles.is_active
  if (!profile || profile.is_active !== true || !allowedRoles.includes(profile.role)) {
    throw new Error('Unauthorized');
  }
}
```

**Roles allowed:** Parametric (`['administrator', 'manager']` or `['administrator']`)
**is_active enforced:** ✅ Yes

---

### Pattern C — `rpc('get_my_role')` (21 call sites, 18 action files + 3 API routes)

```ts
const { data: role, error: roleError } = await supabase.rpc('get_my_role');
if (roleError || (role !== 'administrator' && role !== 'manager')) {
  return { error: 'Unauthorized' };
}
```

**NULL behavior:** When `is_active = false`, DB returns NULL. `null !== 'administrator'` → deny. ✅
**is_active enforced:** ✅ Yes (via DB function, post Stage 5C)

**Complete caller list:**
- `addBillingEntry.ts` — `addBillingEntry`, `updateBillingEntry`, `deleteBillingEntry`
- `addInternalAddon.ts` — `addInternalAddon`
- `deleteDocument.ts` — `deleteDocument` (administrator-only)
- `deleteLlcOrder.ts` — `deleteLlcOrder`
- `manageClientNotifications.ts` — `createClientNotification`, `updateClientNotification`, `deleteClientNotification`
- `manageOrderMembers.ts` — `addOrderMember`, `updateOrderMember`, `removeOrderMember`
- `manageTickets.ts` — `sendTicketMessage`, `updateTicketStatus`, `assignTicket`
- `markOrderViewed.ts` — `markOrderViewed`
- `removeInternalAddon.ts` — `removeInternalAddon`
- `requestDocumentResubmission.ts` — `requestDocumentResubmission`
- `updateAddonStatus.ts` — `updateAddonStatus`
- `updateFormationDetails.ts` — `updateFormationDetails`
- `updateFormationInfo.ts` — `updateFormationInfo`
- `updateGeneralInfo.ts` — `updateGeneralInfo`
- `updateInternalAddon.ts` — `updateInternalAddon`
- `updateOrderAddons.ts` — `updateOrderAddons`
- `updateOrderBilling.ts` — `updateOrderBilling`
- `updateOrderStatus.ts` — `updateOrderStatus`
- `api/admin/orders/[orderId]/documents/route.ts` — POST (administrator-only)
- `api/admin/services/route.ts` — GET (admin+manager)
- `api/documents/[docId]/view/route.ts` — GET (role-aware via `canViewDocument()`)

---

### Pattern D — Inline DB query (4 files, Stage 4/5B fixed)

Used in: `addonActions.ts` (×6 sites), `expenseActions.ts` (×6 sites), `markNotificationsRead.ts`, `api/admin/notifications/route.ts`

```ts
const { data: profile } = await supabase
  .from('profiles')
  .select('role, is_active')
  .eq('id', user.id)
  .single();

if (!profile || profile.is_active !== true || profile.role !== 'administrator') {
  return { error: '...' };
}
```

**is_active enforced:** ✅ Yes (after Stages 4 and 5B)

---

### Pattern E — `getAdminUser()` (layouts + 3 API routes)

```
getAdminUser() → role + is_active enforced → AdminProfile or null
```

**is_active enforced:** ✅ Yes

---

### Pattern F — `verifyAdministrator()` in `backfillOrderCompanies.ts` (outlier)

```ts
const { data: { user } } = await supabase.auth.getUser();  // live call
// ...
const { data: profile } = await supabase
  .from('profiles')
  .select('role, is_active')                               // post Stage 6 fix
  .eq('id', user.id)
  .single();

if (profileError || !profile || profile.is_active !== true || role !== 'administrator') {
  return { ok: false, error: '...' };
}
```

**Identity source:** `auth.getUser()` (live — more secure than necessary, safe to replace with `getClaims()` in a future cleanup)
**is_active enforced:** ✅ Yes (after Stage 6 fix)
**Note:** This is the only Server Action using `getUser()`. Future refactors should migrate to `getClaims()` for consistency.

---

### Pattern G — Dashboard actions (customer ownership model)

Used in: `src/lib/dashboard/actions.ts`

```ts
const session = await getSession();  // getClaims() + profiles.*
if (session.user.id !== userId) {
  return { error: 'Unauthorized' };
}
// → ownership-verified mutation
```

**Role enforcement:** None (customers have no role-based restriction within their own dashboard)
**Ownership enforcement:** ✅ `session.user.id` (server-derived) must equal the `userId` parameter
**is_active enforcement:** Not applicable for customers — deactivation is handled via Auth ban at proxy level

---

### Pattern H — `markAllNotificationsRead()` (client-supplied params, server-ignored)

**File:** `src/lib/admin/actions/markNotificationsRead.ts`

Function signature accepts `adminId` and `adminRole` parameters for backward compatibility, but all mutations use server-derived `verifiedId` and `verifiedRole`:

```ts
const verifiedId = user.id;        // from getClaims(), never from adminId param
const verifiedRole = profile.role; // from DB query, never from adminRole param
```

**Security guarantee:** Client-supplied identity and role are silently ignored. All DB operations use server-derived values.

---

### Authorization Decision Matrix

| Principal | Route/Action type | Allowed |
|-----------|------------------|---------|
| Active administrator | All admin pages, all admin actions, all admin APIs | ✅ |
| Active manager | Admin pages, admin+manager actions, admin+manager APIs | ✅ |
| Active manager | Administrator-only actions (`deleteDocument`, `deleteUser`, settings, etc.) | ❌ |
| Inactive administrator | Any | ❌ (all paths deny) |
| Inactive manager | Any | ❌ (all paths deny) |
| Customer (active) | Dashboard pages/actions (own resources only) | ✅ |
| Customer (active) | Admin pages/actions | ❌ |
| Customer (deactivated via ban) | Any | ❌ (proxy `getUser()` detects ban) |
| Unauthenticated | Public routes, onboarding, login | ✅ |
| Unauthenticated | Dashboard, admin pages | ❌ (redirected) |

---

## Section 5 — Security Invariants

### INV-1: Proxy perimeter must use `auth.getUser()`

**Location:** `src/proxy.ts:79`
**Rule:** The proxy function's identity check must always call `supabase.auth.getUser()`. It must never be replaced with `getClaims()` or any other non-live check.
**Why:** `getUser()` is the only call that detects revoked sessions and banned users before a request reaches any handler. `getClaims()` performs only local JWT signature verification and cannot detect server-side revocation.
**What breaks if removed:** Revoked admin sessions would remain active until their JWT expires (up to 1 hour). An admin who was globally signed out or banned could still access protected pages during this window.

---

### INV-2: `get_my_role()` must enforce `is_active = true`

**Location:** `public.get_my_role()` Postgres function
**Rule:** The function body must include `AND is_active = true` in the WHERE clause.
**Why:** 21 application call sites depend on this function returning NULL for inactive users. If the predicate is removed, all RPC-based authorization paths lose inactive-admin enforcement simultaneously.
**What breaks if removed:** Inactive administrators and managers pass all 21 RPC-protected authorization checks.
**Rollback procedure:** Restore the predicate with a new migration. No application code changes needed.

---

### INV-3: Admin actions must derive identity server-side

**Rule:** The identity used in any admin mutation (the user ID written to audit logs, used in queries, stored in cache tags) must come from `getClaims().claims.sub` or `getUser().data.user.id` — never from a client-supplied parameter.
**Why:** Client-supplied user IDs are forgeable. A client could supply another admin's ID to write mutations attributed to that admin.
**Example of correct pattern:** `markAllNotificationsRead()` — accepts `adminId` parameter but uses `const verifiedId = user.id` (from `getClaims()`) for all operations.
**What breaks if violated:** Privilege escalation via identity spoofing. Attribution of mutations to wrong users.

---

### INV-4: Client-supplied role values must never be trusted

**Rule:** Authorization decisions must never use role values supplied by the client (request body, headers, parameters).
**Why:** Any client can forge a role claim.
**Where this was a past gap:** `markAllNotificationsRead()` previously used `adminRole` parameter for `target_role` filtering. Fixed in Stage 4 — now uses `verifiedRole = profile.role` from DB.
**What breaks if violated:** A customer could forge `adminRole='administrator'` to access admin-scoped data or operations.

---

### INV-5: Authorization decisions must come from fresh database state

**Rule:** Role and `is_active` must be read from `profiles` at the time of each action — not cached from a prior request, not from the JWT, not from a cookie.
**Why:** Database state changes (role demotion, deactivation) take effect immediately for all subsequent requests. JWT-cached roles would remain stale until expiry.
**Correct pattern:** `supabase.from('profiles').select('role, is_active').eq('id', user.id).single()` per action.
**What breaks if violated:** A demoted or deactivated admin could continue executing privileged actions until their token expires.

---

### INV-6: API routes that bypass the proxy must self-authenticate

**Rule:** Every route under `/api/*` that performs privileged operations must independently verify identity and authorization. The proxy does not protect these routes.
**Why:** `proxy.ts` explicitly calls `NextResponse.next()` for all paths starting with `/api/`. No auth check runs at the proxy for these routes.
**Current compliance:** All active admin API routes have independent auth. Two placeholder routes (`/api/admin/analytics`, `/api/admin/customers`) have no auth — they must be secured before receiving real implementations.
**What breaks if violated:** A new admin API route without auth is directly accessible without session verification.

---

### INV-7: `getAdminUser()` is the authoritative admin identity + active-status gate for layouts

**Rule:** Both `src/app/admin/layout.tsx` and `src/app/admin/(dashboard)/layout.tsx` must call `getAdminUser()` and redirect to `/sign-in` on null. Neither layout may remove this call.
**Why:** These layouts are the second line of defense (after the proxy) for admin page routes. They enforce `is_active` which the proxy does not.
**What breaks if removed:** Inactive admins who pass the proxy reach admin page content.

---

### INV-8: Deactivating an administrator requires both DB and Auth changes

**Rule:** Admin deactivation must set both `profiles.is_active = false` AND apply an Auth ban (`ban_duration = '876600h'`).
**Why:** `is_active = false` blocks all application-level authorization. The Auth ban causes `getUser()` at the proxy to fail, revoking the session immediately.
**Where this is implemented:** `src/lib/admin/actions/userActions.ts` → `deactivateUser()`.
**What breaks if only one is applied:**
- `is_active = false` only: Blocked at all downstream checks, but the proxy still lets them reach the layout before redirect. Session remains technically alive.
- Auth ban only: Proxy blocks future requests, but if somehow a request reaches an action (e.g., the proxy bypassed), `is_active` is still true and the action would allow it.

---

### INV-9: `canViewDocument()` with NULL role must not grant admin-level access

**Location:** `src/lib/auth/document-authorization.ts`
**Rule:** The function must not have a code path that grants admin-level document access when `role === null`.
**Current behavior:** `null === 'administrator'` → false; `null === 'manager'` → false; falls through to `doc.profile_id === userId` (customer-level only). ✅
**Why this matters:** After the Stage 5C `get_my_role()` migration, inactive admins receive `null` from the RPC. This function must degrade them to customer-level, not grant admin access.

---

### INV-10: Onboarding data ownership enforcement

**Rule:** Onboarding submission endpoints (`/api/onboarding/submit`, `/api/onboarding/create-order`) must verify `user.sub === userId` before creating orders. They must never create an order with a `user_id` that differs from the authenticated user's sub claim.
**Why:** Prevents a user from submitting an order attributed to another user.
**Current pattern in `create-order`:** `if (!user || user.sub !== userId) → 401`
**What breaks if violated:** One user can create orders on behalf of another.

---

## Section 6 — Performance Invariants

### React `cache()` Wrappers (Request-Scoped Deduplication)

| Function | File | Purpose |
|----------|------|---------|
| `getSession` | `src/lib/auth/get-session.ts` | Deduplicates `getClaims()` + profile query within one render tree |
| `getAdminUser` | `src/lib/admin/getAdminUser.ts` | Deduplicates admin identity + role check. Both layouts share this result |
| `getCurrentAdminProfile` | `src/lib/admin/getCurrentAdminProfile.ts` | Deduplicates settings profile fetch |

**Critical:** `getAdminUser()` is called by BOTH `admin/layout.tsx` AND `admin/(dashboard)/layout.tsx` on every admin page request. React `cache()` ensures this runs once per request, not twice. Removing the `cache()` wrapper doubles the identity+DB cost on every admin page load.

### `unstable_cache` Wrappers (Cross-Request Cache, L1)

| Function | Tags | TTL |
|----------|------|-----|
| `getCachedUnreadNotifications(adminId, role)` | `notif-list-${adminId}` | 30s |
| `getUnreadOrderCount(adminId)` | `unread-orders-${adminId}` | 60s |
| `getCachedDashboardData(userId, ...)` | `customer-dashboard-${userId}` | 60s |
| `getCachedB2BDashboardData(...)` | `customer-dashboard-${userId}` | 60s |

**Do not move these calls inside auth helpers** — they are intentionally outside the auth path to avoid caching sensitive authorization state.

### Performance Instrumentation

**File:** `src/lib/perf.ts`
**Function:** `time(label, fn)` — wraps any async call, logs `[perf] label = Xms` to server console.

Currently instrumented:
- `proxy:auth.getUser()` — proxy identity check latency
- `proxy:role query` — proxy profile query latency
- `getSession:auth.getClaims()` — session claims latency
- `getSession:profile query` — session profile query latency
- `getAdminBadgeCounts:counts` — badge count query latency

**Dead export:** `beginTrace()` is exported but never called. Safe to leave.

### Hot Paths (Must Not Regress)

1. **Admin page load**: `proxy:getUser` + `getAdminUser()` (React cache deduped) + `getCachedUnreadNotifications` + `getUnreadOrderCount` + `getCachedDashboardData` all on critical path.
2. **Admin action authorization**: `getClaims()` + `profiles.role+is_active` query = ~400–600ms total (dominated by cold DB connection).
3. **`get_my_role()` RPC**: Measured avg 209ms post-migration. Same indexed lookup as before, negligible change from `is_active` predicate.

---

## Section 7 — Call Graph Inventory

### Authentication Helper Call Graph

```
supabase.auth.getClaims()
  ← getSession() [src/lib/auth/get-session.ts]
      ← getSessionSafe()
          ← getAdminUser() [src/lib/admin/getAdminUser.ts]
              ← src/app/admin/layout.tsx
              ← src/app/admin/(dashboard)/layout.tsx
              ← src/app/api/admin/config/addons/route.ts
              ← src/app/api/admin/config/plans/route.ts
              ← src/app/api/admin/users/search/route.ts
              ← src/lib/admin/actions/getAdminBadgeCounts.ts
      ← src/app/dashboard/layout.tsx
      ← src/lib/dashboard/actions.ts (all functions)
  ← getCurrentAdminProfile() [src/lib/admin/getCurrentAdminProfile.ts]
      ← src/lib/admin/actions/settingsActions.ts (×3)
  ← verifyAdminRole() [inline in 4 action files]
  ← verifyRole(allowedRoles) [inline in 2 action files]
  ← inline getClaims() [addonActions.ts ×6, expenseActions.ts ×6, markNotificationsRead.ts]
  ← src/app/api/admin/notifications/route.ts
  ← src/app/api/onboarding/complete/route.ts
  ← src/app/api/onboarding/submit/route.ts
  ← src/app/api/onboarding/create-order/route.ts
  ← src/app/api/onboarding/coupons/validate/route.ts
  ← src/app/api/onboarding/draft/route.ts (POST, optional)
  ← src/app/api/onboarding/draft/link/route.ts
  ← src/app/api/dashboard/notifications/route.ts

supabase.auth.getUser()
  ← src/proxy.ts:79 [MUST_REMAIN getUser()]
  ← src/app/api/documents/[docId]/view/route.ts [MUST_REMAIN getUser() — self-boundary]
  ← src/lib/admin/actions/backfillOrderCompanies.ts [safe to replace with getClaims()]
  ← src/app/auth/callback/route.ts [safe to replace with getClaims()]
```

### Admin Authorization Call Graph

```
getClaims() → claims.sub
  → profiles.role + profiles.is_active (direct query)
    → verifyAdminRole() throws OR returns {supabase, actorId}
        ← userActions.ts: createUser, updateUser, deactivateUser, deleteUser
        ← couponActions.ts: createCoupon, updateCoupon, deleteCoupon, toggleCouponStatus
        ← packageActions.ts: createPackage, updatePackage, togglePackageStatus, deletePackage
        ← b2bCustomerActions.ts: createB2BCustomer, updateB2BCustomer, ...

    → verifyRole(['administrator','manager']) throws OR returns {supabase, userId}
        ← paypalOrderActions.ts: createPaypalOrder, updatePaypalOrder
        ← invoiceActions.ts: createInvoice, updateInvoice, deleteInvoice

    → inline guard (is_active + role)
        ← addonActions.ts: createAddon, updateAddon, restoreAddon (admin+manager)
        ← addonActions.ts: deleteAddon, deleteAddonCategory (admin-only)
        ← expenseActions.ts: createExpense, updateExpense (admin+manager)
        ← expenseActions.ts: deleteExpense, deleteExpenseCategory (admin-only)
        ← paypalOrderActions.ts: deletePaypalOrder (admin-only)
        ← markNotificationsRead.ts: markAllNotificationsRead

    → settingsActions.ts: updateAdminEmail, updateAdminPassword, forceLogoutAllSessions
        uses getCurrentAdminProfile() → isActive + role check per function

getClaims() → rpc('get_my_role') [returns role|NULL based on is_active]
    ← 21 call sites (see Section 4, Pattern C)

getClaims() → getAdminUser() → null→redirect|AdminProfile
    ← admin/layout.tsx
    ← admin/(dashboard)/layout.tsx
    ← 3 admin API routes
    ← getAdminBadgeCounts.ts

verifyAdministrator() [backfillOrderCompanies.ts — uses getUser()]
    → profiles.role + profiles.is_active
    ← backfillOrderCompanies()
```

### Dashboard Actions Call Graph

```
getSession() [getClaims + profiles.*]
  → session.user.id (server-derived)
  → ownership check: session.user.id === param
    ← updateCustomerProfile(userId, ...)
    ← updateCustomerEmail(formData)
    ← updateCustomerPassword(formData)
    ← submitDocumentProof(orderId, ...) → also: orders.eq('user_id', userId) check
    ← submitBankTransferReceipt(orderId, ...) → also: orders.eq('user_id', userId) check
    ← simulateStripePayment(orderId) → also: orders.eq('user_id', userId) check
    ← markCustomerNotificationsRead(userId)
    ← createSupportQuery(userId, ...)
    ← sendSupportMessage(queryId, ...) → also: queries.eq('user_id', userId) check
```

---

## Section 8 — API Security Matrix

| Route | Method | Auth Mechanism | Role Check | is_active Check | Ownership Check | Proxy Protected | Risk Level |
|-------|--------|----------------|------------|-----------------|-----------------|-----------------|------------|
| `/api/admin/analytics` | GET | ❌ None (placeholder) | None | None | None | No | 🔴 HIGH when implemented |
| `/api/admin/config/addons` | GET | `getAdminUser()` | admin+manager | ✅ | None | No (self-auth) | 🟢 LOW |
| `/api/admin/config/plans` | GET | `getAdminUser()` | admin+manager | ✅ | None | No (self-auth) | 🟢 LOW |
| `/api/admin/customers` | GET | ❌ None (placeholder) | None | None | None | No | 🔴 HIGH when implemented |
| `/api/admin/documents/[docId]/view` | GET | Redirects (307) | None | None | None | No | 🟢 LOW (redirects to auth'd route) |
| `/api/admin/notifications` | GET | `getClaims()` | admin+manager | ✅ | None | No (self-auth) | 🟢 LOW |
| `/api/admin/orders/[orderId]/documents` | POST | `getClaims()` + RPC | administrator | ✅ (via RPC) | orderId from path | No (self-auth) | 🟢 LOW |
| `/api/admin/services` | GET | `getClaims()` + RPC | admin+manager | ✅ (via RPC) | None | No (self-auth) | 🟢 LOW |
| `/api/admin/users/search` | GET | `getAdminUser()` | admin+manager | ✅ | None | No (self-auth) | 🟢 LOW |
| `/api/auth/callback` | GET | Code exchange | None | None | None | No | 🟢 LOW (auth flow) |
| `/api/auth/logout` | GET | None (signs out current cookies) | None | None | None | No | 🟢 LOW (intentional) |
| `/api/dashboard/notifications` | GET | `getClaims()` | B2B branch only | ❌ | `user.sub` | No (self-auth) | 🟡 MED (no is_active for customers) |
| `/api/documents/[docId]/view` | GET | `auth.getUser()` live | RPC (via canViewDocument) | ✅ (via RPC) | `doc.profile_id === userId` | No (self-auth) | 🟢 LOW |
| `/api/keep-alive` | GET | `Authorization: Bearer CRON_SECRET` | None | None | None | No | 🟢 LOW |
| `/api/onboarding/addons` | GET | None (public) | None | None | None | No | 🟢 LOW (public data) |
| `/api/onboarding/auth/email-exists` | GET | None (public) | None | None | None | No | 🟡 MED (user enumeration) |
| `/api/onboarding/complete` | POST | `getClaims()` required | None | None | `user.sub` | No | 🟢 LOW |
| `/api/onboarding/coupons/validate` | POST | `getClaims()` required | None | None | `user.sub` | No | 🟢 LOW |
| `/api/onboarding/create-order` | POST | `getClaims()` | None | None | `user.sub === userId` | No | 🟢 LOW |
| `/api/onboarding/draft` | GET/POST | Optional `getClaims()` | None | None | `temp_session_key` | No | 🟡 MED (anon by design) |
| `/api/onboarding/draft/link` | POST | `getClaims()` required | None | None | `user.sub` | No | 🟢 LOW |
| `/api/onboarding/packages` | GET | None (public) | None | None | None | No | 🟢 LOW (public data) |
| `/api/onboarding/save-draft` | GET | None (placeholder) | None | None | None | No | ⚪ STUB |
| `/api/onboarding/save-step` | POST | None | None | None | `temp_session_key` | No | 🟡 MED (anon by design) |
| `/api/onboarding/ssn` | POST | None | None | None | `temp_session_key` | No | 🟡 MED (anon by design) |
| `/api/onboarding/submit` | POST | `getClaims()` | None | None | `user.sub` | No | 🟢 LOW |
| `/api/onboarding/upload` | POST | None | None | None | `temp_session_key` (UUID) | No | 🟡 MED (anon by design) |
| `/api/onboarding/upload-document` | POST | None | None | None | `tempSessionKey` present | No | 🟡 MED (anon by design) |
| `/api/onboarding/upload-receipt` | POST | ❌ None | None | None | ❌ None | No | 🔴 HIGH (Cloudinary abuse) |
| `/api/orders` | GET | None (placeholder) | None | None | None | No | ⚪ STUB |
| `/api/upload/cloudinary` | GET | None (placeholder) | None | None | None | No | ⚪ STUB |
| `/api/upload/supabase` | GET | None (placeholder) | None | None | None | No | ⚪ STUB |

---

## Section 9 — Admin Security Model

### Role Hierarchy

```
administrator
  → All admin actions
  → All manager actions
  → Administrator-only actions (delete document, delete order, user management, settings, delete addons/expenses/categories)

manager
  → All manager-allowed actions
  → Cannot: delete documents, delete orders, manage users, change settings, delete addons/expenses/categories, delete paypal orders

customer
  → Dashboard only
  → Own resources only (orders, documents, notifications, tickets)

b2b_customer
  → Dashboard in B2B mode
  → Assigned LLCs only, limited sidebar
```

### Behavior Matrix

| Operation | Active Admin | Inactive Admin | Active Manager | Inactive Manager | Customer |
|-----------|-------------|----------------|----------------|------------------|----------|
| View admin pages | ✅ | ❌ (layout redirect) | ✅ | ❌ (layout redirect) | ❌ (proxy redirect) |
| `verifyAdminRole()` actions | ✅ | ❌ (is_active) | ❌ (role) | ❌ (role) | ❌ (role) |
| `verifyRole(['admin','mgr'])` actions | ✅ | ❌ (is_active) | ✅ | ❌ (is_active) | ❌ (role) |
| RPC `get_my_role()` actions | ✅ | ❌ (NULL from DB) | ✅ | ❌ (NULL from DB) | ❌ (NULL from DB) |
| `getAdminUser()` API routes | ✅ | ❌ (is_active) | ✅ | ❌ (is_active) | ❌ (role) |
| Admin settings | ✅ | ❌ (isActive check) | ❌ (role) | ❌ (role+isActive) | ❌ (role) |
| Admin notifications | ✅ | ❌ (is_active) | ✅ | ❌ (is_active) | ❌ (role) |
| backfillOrderCompanies | ✅ | ❌ (is_active, post Stage 6) | ❌ (role) | ❌ (role) | ❌ (role) |
| Dashboard actions (own) | N/A | N/A | N/A | N/A | ✅ |
| Dashboard actions (other user) | N/A | N/A | N/A | N/A | ❌ (ownership) |

### Deactivation Mechanism

Deactivating an admin user via `deactivateUser()` in `userActions.ts`:
1. Sets `profiles.is_active = false` → blocked at all downstream `is_active` checks
2. Sets `auth.users.ban_duration = '876600h'` (100 years) → proxy's `getUser()` returns revocation error on next page load

Reactivating via `deactivateUser()` (toggles):
1. Sets `profiles.is_active = true`
2. Sets `auth.users.ban_duration = 'none'`

---

## Section 10 — Database Security Model

### Row-Level Security (RLS)

RLS is enforced on all user-facing tables. Admins use `createAdminClient()` (service role key) to bypass RLS for mutations that require cross-user access. Users receive the anon-key SSR client, which enforces RLS.

Key RLS policies:
- `Customers can read order documents`: customers can only SELECT documents where they are the `profile_id`
- Order isolation: customers can only read/write their own orders

### `public.get_my_role()` RPC

```sql
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT role FROM public.profiles
  WHERE id = auth.uid()
    AND is_active = true;
$function$;
```

**Return values:**
- `'administrator'` — active admin
- `'manager'` — active manager
- `NULL` — inactive user (is_active = false), or user with non-admin/manager role, or unauthenticated

**NULL meaning:** The caller is either unauthenticated, inactive, or not an admin/manager role. All callers treat NULL as unauthorized.

**SECURITY DEFINER:** Executes with the privileges of the function owner (postgres), not the calling user. This allows it to query `profiles` even when RLS would otherwise restrict the caller.

**`SET search_path TO ''`:** Prevents search-path injection attacks by requiring fully-qualified table references.

**STABLE:** Postgres can cache the result within a single query execution but will re-execute across separate queries. This is correct — each RPC call performs a fresh DB read.

### Profile Table Authorization Columns

```sql
profiles.role       -- user_role enum: administrator|manager|customer|b2b_customer
profiles.is_active  -- boolean: false = deactivated, true = active
```

Both are set at registration (default: `customer`, `true`) and modified by admin actions.

---

## Section 11 — Known Security Decisions

### Decision Log

---

**Decision D-01**: Proxy uses `auth.getUser()` — not migrated to `getClaims()`
- **Date:** Pre-Stage 2A (preserved during migration)
- **Reason:** `getUser()` is the only mechanism that detects revoked sessions server-side before request execution. All downstream code can safely use `getClaims()` because revoked sessions are caught here first.
- **Risk accepted:** Minor latency (~200–400ms) per qualifying page request. Acceptable for security boundary.
- **Alternatives rejected:** `getClaims()` at proxy — would remove revocation detection entirely.

---

**Decision D-02**: `getClaims()` migration for all admin actions (completed Stage 2A)
- **Date:** Stage 2A
- **Reason:** All admin Server Actions previously used `getUser()` unnecessarily — they run behind the proxy perimeter which already provides revocation protection. `getClaims()` is faster and sufficient.
- **Risk accepted:** Negligible — revocation is handled at proxy.
- **Alternatives rejected:** Keeping `getUser()` in all actions — correct but slower; creates architectural ambiguity about which calls need to stay `getUser()`.

---

**Decision D-03**: `is_active` enforcement added to all admin authorization paths (Stages 4, 5B, 5C, 6)
- **Date:** Stages 4–6
- **Reason:** Original codebase had no `is_active` enforcement. All admin auth paths checked only `role`. A deactivated admin with a valid JWT could execute any privileged operation.
- **Layers of enforcement added:**
  - Application-level DB queries (Stages 4, 5B, 6)
  - `getAdminUser()` (Stage 5B)
  - `get_my_role()` DB function (Stage 5C)

---

**Decision D-04**: `get_my_role()` DB function enforces `is_active = true` at DB level
- **Date:** Stage 5C
- **Reason:** 21 call sites used the RPC function. Rather than patching each caller, a single DB migration enforces `is_active` once at the source. NULL return for inactive users is compatible with all existing callers (`NULL !== 'administrator'` → deny).
- **Risk accepted:** None. NULL is already the expected return for unauthorized users.
- **Rollback procedure:** Re-create function without `AND is_active = true`.

---

**Decision D-05**: `markAllNotificationsRead()` derives identity server-side despite client parameters
- **Date:** Stage 4
- **Reason:** The function signature accepts `adminId` and `adminRole` for legacy UI compatibility. These parameters are silently ignored; all DB operations use server-derived values.
- **Risk accepted:** Dead parameters remain in the function signature. Future cleanup may remove them.
- **Alternatives rejected:** Removing parameters immediately — would require UI changes out of scope.

---

**Decision D-06**: Onboarding routes intentionally unauthenticated
- **Date:** Original design
- **Reason:** Anonymous onboarding is required — users must be able to start a form before creating an account. `temp_session_key` (UUID) acts as a possession proof for anonymous sessions.
- **Risk accepted:** The `/api/onboarding/upload-receipt` route has no possession proof — anyone can upload files to Cloudinary. Risk: storage cost abuse. No PII exposure.
- **Alternatives rejected:** Requiring auth before any onboarding step — would break the pre-registration UX.

---

**Decision D-07**: `backfillOrderCompanies.ts` continues to use `auth.getUser()` (not migrated in Stage 2A)
- **Date:** Identified in Stage 6 audit
- **Reason:** This file was missed during the Stage 2A `getClaims()` migration. Using `getUser()` is MORE secure than `getClaims()` for a Server Action (provides revocation detection), so it was not causing a security regression — only an architectural inconsistency.
- **Risk accepted:** Minor: slightly slower than necessary for a Server Action behind the proxy perimeter.
- **Future recommendation:** Migrate to `getClaims()` during cleanup.

---

## Section 12 — Regression Test Inventory

### Test Suite: `scratch/security-tests.mjs`

| Test | Purpose | Expected Result |
|------|---------|-----------------|
| T-CUST | Customer reads own order (RLS allow) | Row returned |
| T-ISO | Customer B cannot read Customer A order (RLS deny) | Empty result |
| T-ADMIN | Active admin reads customer order via live DB role policy | Row returned |
| T-NOTIF-OWN | Customer reads own direct notification | Row returned |
| T-NOTIF-ISO | Customer B cannot read Customer A notification | Empty/forbidden |
| T-IDENTITY | `getClaims().sub === getUser().id` (same principal) | sub equals id |
| T-EXPIRY | Tampered token fails `getClaims()` signature check | Auth error |
| T-LOGOUT | After `signOut`, refresh token revoked | Cannot mint new session |

**Protects:** RLS isolation, JWT integrity, session revocation.

---

### Test Suite: `scratch/stage3-validation-tests.mjs`

| Test | Purpose | Expected Result |
|------|---------|-----------------|
| T-ADMIN-DEMOTION | Admin demoted mid-session → same token → privileged mutation must fail | Denied |
| T-ADMIN-DEACTIVATION | Admin deactivated mid-session → same token → privileged mutation must fail | Denied |
| T-AUTHORIZATION-EQUIVALENCE | `getUser()` vs `getClaims()` produce identical allow/deny matrix | Identical results |

**Protects:** Session-state-change detection, `getClaims()` migration safety.

---

### Test Suite: `scratch/stage4-validation-tests.mjs`

| Test | Purpose | Expected Result |
|------|---------|-----------------|
| T-INACTIVE-ADMIN (active admin) | Active admin allowed before deactivation | Allowed |
| T-INACTIVE-ADMIN (inactive admin) | Inactive admin denied, blocked at IS_ACTIVE | Denied at is_active |
| T-INACTIVE-ADMIN (active manager) | Active manager allowed | Allowed |
| T-INACTIVE-ADMIN (inactive manager) | Inactive manager denied | Denied at is_active |
| T-INACTIVE-ADMIN (customer) | Customer denied | Denied at ROLE |
| T-NOTIF-SERVER-IDENTITY (valid admin) | Server-derived identity matches real user | uid equals userId |
| T-NOTIF-SERVER-IDENTITY (forged adminId) | Server ignores forged adminId | Server uses authenticated uid |
| T-NOTIF-SERVER-IDENTITY (forged adminRole) | Server uses DB role, not client param | Real role checked |
| T-NOTIF-SERVER-IDENTITY (inactive admin) | Denied despite valid client params | Denied at is_active |
| T-AUTHORIZATION-EQUIVALENCE (8-row matrix) | All role/is_active combinations correct | Matrix matches expected |

**Protects:** `is_active` enforcement on Stage 4 paths, server-side identity derivation.

---

### Test Suite: `scratch/stage5c-rpc-validation.mjs`

| Test | Purpose | Expected Result |
|------|---------|-----------------|
| T-RPC-INACTIVE (active admin) | `get_my_role()` returns `'administrator'` | Returns role |
| T-RPC-INACTIVE (active manager) | `get_my_role()` returns `'manager'` | Returns role |
| T-RPC-INACTIVE (inactive admin) | `get_my_role()` returns NULL | NULL |
| T-RPC-INACTIVE (inactive manager) | `get_my_role()` returns NULL | NULL |
| T-RPC-INACTIVE (customer) | `get_my_role()` returns NULL | NULL (not admin enum value) |
| T-RPC-DEACTIVATION | Admin deactivated mid-session → get_my_role returns NULL immediately | NULL |
| T-RPC-OPERATIONS (admin+manager matrix) | 5-row matrix for admin+manager actions | Correct allow/deny |
| T-RPC-OPERATIONS (admin-only matrix) | 5-row matrix for administrator-only actions | Correct allow/deny |
| T-RPC-REACTIVATION | Reactivated admin regains role | Returns role again |
| T-RPC-PERF | `get_my_role()` latency < 1000ms | avg ~209ms, max ~220ms |

**Protects:** DB-level `is_active` enforcement in `get_my_role()`, all 21 RPC call sites.

---

## Section 13 — Future Change Checklist

Before making any change to the codebase, answer the following:

1. **Does this modify `src/proxy.ts`?**
   If yes: Verify `auth.getUser()` remains at line 79. Verify all bypass conditions (API, static, public routes) are preserved.

2. **Does this affect revocation detection?**
   If yes: Any change to `getUser()` → `getClaims()` migrations must not touch `proxy.ts` or `src/app/api/documents/[docId]/view/route.ts`. Both are MUST_REMAIN `getUser()`.

3. **Does this add or modify an admin authorization check?**
   If yes: The check must include ALL of: identity from `getClaims()`, role from DB, `is_active` from DB. None of these three may be derived from client input.

4. **Does this add or modify `is_active` enforcement?**
   If yes: Verify the check is `profile.is_active !== true` (not `!profile.is_active` — avoids null coalescion ambiguity). Ensure it appears in the condition BEFORE the role check so inactive users fail fast.

5. **Does this affect ownership validation in dashboard actions?**
   If yes: Verify `session.user.id` (server-derived) is compared against the parameter. Client-supplied user IDs must never be used for ownership decisions without verification.

6. **Does this add a new `rpc('get_my_role')` call site?**
   If yes: Verify the caller handles NULL correctly (`null !== 'administrator'` → deny). No additional app-level `is_active` check needed — the DB function handles it.

7. **Does this create a new `/api/*` route with privileged operations?**
   If yes: The route MUST include independent auth (the proxy does not protect it). Use `getAdminUser()` for admin+manager routes, or `getClaims()` + profile query for fine-grained control.

8. **Does this modify or extend `get_my_role()` in the database?**
   If yes: The `AND is_active = true` predicate must be preserved. The function must remain `SECURITY DEFINER` with `SET search_path TO ''`.

9. **Does this modify a `React.cache()`-wrapped function?**
   If yes: Verify that adding parameters or changing return shapes does not break request-level deduplication. `getAdminUser()` is called from two layouts — both must receive the same cached result.

10. **Does this modify a cache tag name used by `revalidateTag()`?**
    If yes: All producers and consumers of that tag must be updated atomically. A renamed tag silently stops invalidating the old cache.

---

## Section 14 — Architectural Stop Conditions

Immediately stop implementation and produce a written report if any of the following are discovered or proposed:

| Condition | Reason to stop |
|-----------|---------------|
| A new admin action does not check `profiles.is_active` | Inactive admin bypass |
| A new admin action uses a client-supplied role value | Privilege escalation via forged role |
| A new admin action uses a client-supplied user ID without server verification | Identity spoofing |
| A new `/api/*` route with privileged operations has no independent auth | Proxy bypass exploitation |
| Any proposal to replace `proxy.ts` `getUser()` with `getClaims()` | Eliminates revocation detection at perimeter |
| Any proposal to remove `AND is_active = true` from `get_my_role()` | Reopens inactive-admin bypass on all 21 RPC call sites simultaneously |
| A new RPC function returns role or permission data without checking `is_active` | Reintroduces inactive-admin bypass via new DB surface |
| Removing the `getAdminUser()` call from either admin layout | Removes `is_active` gate for all admin pages |
| A new admin mutation derives identity from the request body, headers, or query params | Identity spoofing |
| Moving `getSession()` or `getAdminUser()` outside `React.cache()` | Performance regression: doubles DB queries per admin page load |
| A security test suite produces fewer than its expected pass count | Regression in a known-good security guarantee |

**Required before proceeding:** Written root-cause analysis, proposed fix, and explicit approval.

---

## Section 15 — Living Change Log

### 2026-06-07 — Stage 2A: getClaims() Migration

**Change:** Migrated all admin Server Action identity checks from `auth.getUser()` to `auth.getClaims()`.
**Reason:** `getClaims()` is local (no network call), faster, and correct for downstream code behind the proxy perimeter.
**Security impact:** None. Proxy perimeter still uses `getUser()`. Per-action identity is still verified against the DB.
**Performance impact:** ~200–400ms faster per admin action (eliminates network round-trip to Supabase Auth).
**Preserved:** `proxy.ts` remains `getUser()`.

---

### 2026-06-07 — Stage 3: Perimeter Audit

**Change:** Confirmed trust boundary architecture. No code changes.
**Verification:** Stage 3 test suite 3/3 pass. Security test suite 8/8 pass.

---

### 2026-06-07 — Stage 4: Authorization Hardening

**Change A:** Added `profile.is_active !== true` check to `verifyAdminRole()` helpers in: `userActions.ts`, `couponActions.ts`, `packageActions.ts`, `b2bCustomerActions.ts`.
**Change B:** Added `profile.is_active !== true` check to `verifyRole()` helpers in: `paypalOrderActions.ts`, `invoiceActions.ts`.
**Change C:** `markAllNotificationsRead()` — replaced client-supplied `adminId`/`adminRole` with server-derived `verifiedId`/`verifiedRole`.
**Security impact:** Inactive admins now denied at all previously role-only paths.
**Rollback:** Revert each `is_active` check; restore `adminId`/`adminRole` usage in `markNotificationsRead.ts`.

---

### 2026-06-07 — Stage 5B: Inactive Admin Enforcement (Remaining Gaps)

**Change:** Added `is_active` enforcement to:
- `getAdminUser()` — `profile.is_active !== true` → return null
- `settingsActions.ts` — 3 gates: `admin.isActive !== true`
- `addonActions.ts` — `deleteAddon`, `deleteAddonCategory`: `select('role, is_active')`, condition extended
- `expenseActions.ts` — `deleteExpense`, `deleteExpenseCategory`: same pattern
- `api/admin/notifications/route.ts` — `select('role, is_active')`, combined condition
**Security impact:** Closed remaining application-level inactive-admin gaps.

---

### 2026-06-07 — Stage 5C: RPC Authorization Hardening

**Change:** Applied DB migration `harden_get_my_role_is_active`:
```sql
-- Added: AND is_active = true
SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = true;
```
**Security impact:** 21 RPC call sites now uniformly deny inactive admins at the DB level. No application code changes required.
**Rollback migration:**
```sql
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$ SELECT role FROM public.profiles WHERE id = auth.uid(); $function$;
```

---

### 2026-06-07 — Stage 6: Final Architecture Audit + Finding B1 Fix

**Change:** Fixed `backfillOrderCompanies.ts` `verifyAdministrator()`:
- `select('role')` → `select('role, is_active')`
- Condition: added `!profile || profile.is_active !== true`
**Security impact:** Closed the final inactive-admin authorization gap.
**Remaining open findings:** B2 (proxy is_active gap — defense-in-depth), B3 (upload-receipt no auth), B4 (placeholder routes), B5 (unauthenticated cache actions), B6 (login user enumeration), B7 (duplicate helpers). None are exploitable admin authorization bypasses.
