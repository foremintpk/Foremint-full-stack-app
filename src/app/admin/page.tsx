/**
 * @file src/app/admin/page.tsx
 * @description Entry point for /admin which redirects the user immediately to the main Overview dashboard.
 * 
 * 1. Server vs Client choice rationale: Server Component.
 * 2. Caching layer: N/A.
 * 3. RBAC: Inherited from root admin layout.
 * 4. Revalidation / Cache Busting: N/A.
 */

import { redirect } from 'next/navigation';

export default function AdminPage() {
  redirect('/admin/overview' as any);
}
