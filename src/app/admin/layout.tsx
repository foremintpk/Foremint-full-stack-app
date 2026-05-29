/**
 * @file src/app/admin/layout.tsx
 * @description Root administrator wrapper verifying live auth credentials.
 * 
 * 1. Server vs Client choice rationale: Server Component. Protects the sub-routes with active authentication checks before rendering.
 * 2. Caching layer: Uses getAdminUser() which is cache() wrapped for request-level deduplication.
 *    - Explicitly NO cross-request unstable_cache/revalidate configuration applied here since security/session status must always be verified live.
 * 3. RBAC: Strict. Only administrator and manager roles can proceed; others/unauthenticated bounce.
 * 4. Revalidation / Cache Busting: Always live on every fetch.
 */

import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin/getAdminUser';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();

  if (!admin) {
    redirect('/sign-in?redirect=/admin' as any);
  }

  return <>{children}</>;
}
