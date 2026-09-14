/**
 * @file src/lib/auth/permissions.ts
 * @description What each staff role may reach in the admin dashboard.
 *
 * WHY THIS EXISTS. Authorization in this codebase is otherwise written inline,
 * role by role, in ~55 files. That was workable with two staff roles; with the
 * account_manager role added it becomes a place where one missed file is a
 * silent privilege hole. Anything new should gate through here.
 *
 * THE ACCOUNT MANAGER ROLE. Scoped to LLC registrations and their own account
 * settings. They work orders end to end — edit the record, upload and delete
 * documents, change status, manage billing and members — but the rest of the
 * dashboard is closed: no users, no B2B, no packages, coupons, expenses, blogs,
 * support tickets, EIN/SS-4 generation and no invoice generator.
 *
 * Only an administrator can create an account manager; the role cannot create
 * or promote anyone, itself included. That is enforced in userActions.ts and by
 * the profiles RLS policies, not only here.
 */

import type { UserRole } from '@/lib/auth/get-session';

/** Every admin-dashboard area that is gated. */
export type AdminSection =
  | 'overview'
  | 'llc-registrations'
  | 'ein'
  | 'documents'
  | 'invoice-generator'
  | 'addons'
  | 'packages'
  | 'coupons'
  | 'expenses'
  | 'users'
  | 'b2b-customers'
  | 'queries'
  | 'blogs'
  | 'blog-categories'
  | 'settings';

/**
 * Sections each role may open. Administrator is intentionally not listed — it
 * reaches everything, checked before this map is consulted.
 */
const SECTIONS_BY_ROLE: Partial<Record<UserRole, AdminSection[]>> = {
  manager: [
    'overview',
    'llc-registrations',
    'addons',
    'packages',
    'coupons',
    'expenses',
    'users',
    'b2b-customers',
    'queries',
    'blogs',
    'blog-categories',
    'settings',
  ],

  // LLC work, client invoicing, and their own account settings. Nothing else.
  account_manager: ['llc-registrations', 'invoice-generator', 'settings'],
};

/** Roles that may open the admin dashboard at all. */
export function isStaffRole(role: UserRole | null | undefined): boolean {
  return role === 'administrator' || role === 'manager' || role === 'account_manager';
}

/** True when this role may open the given admin section. */
export function canAccessSection(
  role: UserRole | null | undefined,
  section: AdminSection
): boolean {
  if (!role) return false;
  if (role === 'administrator') return true;
  return SECTIONS_BY_ROLE[role]?.includes(section) ?? false;
}

/**
 * The section an admin route belongs to, derived from its path.
 * Returns null for paths that are not section roots (e.g. /admin itself).
 */
export function sectionForPath(pathname: string): AdminSection | null {
  const match = /^\/admin\/([a-z0-9-]+)/i.exec(pathname);
  if (!match) return null;
  return match[1] as AdminSection;
}

/** Where a role should land when it opens /admin. */
export function landingPathForRole(role: UserRole | null | undefined): string {
  if (role === 'account_manager') return '/admin/llc-registrations';
  return '/admin/overview';
}

/**
 * Whether this role may assign `target` to a user.
 * Only administrators create staff accounts of any kind.
 */
export function canAssignRole(actor: UserRole | null | undefined): boolean {
  return actor === 'administrator';
}
