# Security Invariants

**Status:** Living document. Lightweight reference — extracted from ARCHITECTURE_CONTEXT.md Sections 5, 9, 10, 12, 13, 14.
**Source of truth:** [ARCHITECTURE_CONTEXT.md](./ARCHITECTURE_CONTEXT.md)
**Last updated:** 2026-06-07

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
**Current behavior:** `null === 'administrator'` → false; `null === 'manager'` → false; falls through to `doc.profile_id === userId` (customer-level only). Correct.
**Why this matters:** After the Stage 5C `get_my_role()` migration, inactive admins receive `null` from the RPC. This function must degrade them to customer-level, not grant admin access.

---

### INV-10: Onboarding data ownership enforcement

**Rule:** Onboarding submission endpoints (`/api/onboarding/submit`, `/api/onboarding/create-order`) must verify `user.sub === userId` before creating orders. They must never create an order with a `user_id` that differs from the authenticated user's sub claim.
**Why:** Prevents a user from submitting an order attributed to another user.
**Current pattern in `create-order`:** `if (!user || user.sub !== userId) → 401`
**What breaks if violated:** One user can create orders on behalf of another.

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
| backfillOrderCompanies | ✅ | ❌ (is_active) | ❌ (role) | ❌ (role) | ❌ (role) |
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

---

### Test Suite: `scratch/stage3-validation-tests.mjs`

| Test | Purpose | Expected Result |
|------|---------|-----------------|
| T-ADMIN-DEMOTION | Admin demoted mid-session → same token → privileged mutation must fail | Denied |
| T-ADMIN-DEACTIVATION | Admin deactivated mid-session → same token → privileged mutation must fail | Denied |
| T-AUTHORIZATION-EQUIVALENCE | `getUser()` vs `getClaims()` produce identical allow/deny matrix | Identical results |

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

**Combined test result as of 2026-06-07:** 30/30 passing (security 8/8 + stage3 3/3 + stage4 9/9 + stage5c 10/10). TypeScript clean.

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
