/**
 * @file src/app/admin/(dashboard)/documents/page.tsx
 * @description Bulk document intake and per-order coverage.
 *
 * 1. Server vs Client choice rationale: Server Component. Resolves the session,
 *    enforces the administrator gate, and pre-fetches coverage so the page
 *    renders populated.
 * 2. Caching layer: force-dynamic — document coverage changes on every upload.
 * 3. RBAC: Administrator only, matching /admin/ein and /admin/settings.
 * 4. Revalidation: the client refetches after each committed batch.
 */

import React from 'react';
import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { getCurrentAdminProfile } from '@/lib/admin/getCurrentAdminProfile';
import { getCoverage, TRACKED_CATEGORIES } from '@/lib/services/documents/orderBook';
import DocumentsWorkspace from './_components/DocumentsWorkspace';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const profile = await getCurrentAdminProfile();

  if (!profile) {
    redirect('/sign-in?redirect=/admin/documents' as never);
  }

  if (profile.role !== 'administrator') {
    return (
      <div className="flex items-center justify-center py-12 px-4 font-inter">
        <div className="w-full max-w-md p-8 bg-white border border-[#e0d9f7] rounded-2xl shadow-[0_1px_4px_rgba(52,8,143,0.06)] text-center space-y-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 text-red-600 rounded-full border border-red-100">
            <ShieldAlert size={28} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-manrope text-gray-900">Access Denied</h2>
            <p className="text-sm text-gray-500 font-inter leading-relaxed">
              Document management is restricted to Administrator accounts. Your account has the role of{' '}
              <span className="font-semibold text-gray-700 capitalize select-text">{profile.role}</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // A coverage failure should not blank the page — the upload half still works.
  const coverage = await getCoverage().catch(() => []);

  const active = coverage.filter((r) => r.status === 'formed' || r.status === 'ein_pending');
  const missing = TRACKED_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = active.filter((r) => !r.has[cat]).length;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <DocumentsWorkspace
      initialCoverage={coverage}
      initialStats={{
        totalOrders: coverage.length,
        activeOrders: active.length,
        missing,
      }}
    />
  );
}
