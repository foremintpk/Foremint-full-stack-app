/**
 * @file src/app/admin/(dashboard)/ein/page.tsx
 * @description SS-4 / EIN generation section.
 *
 * 1. Server vs Client choice rationale: Server Component. Resolves the session,
 *    enforces the administrator gate, and pre-fetches the order book, records
 *    and settings so the page renders populated rather than empty-then-fetching.
 * 2. Caching layer: force-dynamic. The attempt ladder decides what is printed on
 *    a filed federal form, so a cached number would be actively misleading.
 * 3. RBAC: Administrator only, matching /admin/settings. Managers are shown the
 *    same access-denied panel used there.
 * 4. Revalidation / Cache Busting: The client refetches after each run.
 */

import React from 'react';
import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { getCurrentAdminProfile } from '@/lib/admin/getCurrentAdminProfile';
import { getEinPendingOrders } from '@/lib/services/ss4/orders';
import { getSs4Records, getSs4Stats } from '@/lib/services/ss4/records';
import { groupIntoBatches } from '@/lib/services/ss4/batches';
import { getSs4Settings, toPublicSettings } from '@/lib/services/ss4/settings';
import { visionStatus } from '@/lib/services/ss4/vision';
import EinWorkspace from './_components/EinWorkspace';

export const dynamic = 'force-dynamic';

export default async function EinPage() {
  const profile = await getCurrentAdminProfile();

  if (!profile) {
    redirect('/sign-in?redirect=/admin/ein' as never);
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
              SS-4 generation is restricted to Administrator accounts. Your account has the role of{' '}
              <span className="font-semibold text-gray-700 capitalize select-text">{profile.role}</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Everything the workspace needs, fetched in parallel. A failure in any one of
  // these should not blank the page, so each falls back to an empty state.
  const [orders, records, stats, settings, vision] = await Promise.all([
    getEinPendingOrders().catch(() => []),
    getSs4Records({ limit: 500 }).catch(() => []),
    getSs4Stats().catch(() => ({ total: 0, passed: 0, failed: 0, atCap: 0 })),
    getSs4Settings(),
    visionStatus(),
  ]);

  return (
    <EinWorkspace
      initialOrders={orders}
      initialBatches={groupIntoBatches(records)}
      initialStats={stats}
      initialSettings={toPublicSettings(settings)}
      visionConfigured={vision.configured}
      visionModel={vision.model}
    />
  );
}
