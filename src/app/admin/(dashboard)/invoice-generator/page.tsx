/**
 * @file src/app/admin/(dashboard)/invoice-generator/page.tsx
 * @description Client-facing invoice PDF builder.
 *
 * Distinct from /admin/invoices, which is the internal PKR bookkeeping ledger —
 * different currency, different audience, different document. This one produces
 * the USD invoice a customer receives.
 *
 * 1. Server vs Client choice rationale: Server Component for the session and
 *    the RBAC gate; the form itself is a Client Component.
 * 2. Caching layer: force-dynamic — the page is a form, nothing to cache.
 * 3. RBAC: Administrator only, matching EIN and Documents.
 * 4. Revalidation: N/A — generating a PDF changes no server state.
 */

import React from 'react';
import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { getCurrentAdminProfile } from '@/lib/admin/getCurrentAdminProfile';
import InvoiceGeneratorForm from './_components/InvoiceGeneratorForm';

export const dynamic = 'force-dynamic';

export default async function InvoiceGeneratorPage() {
  const profile = await getCurrentAdminProfile();

  if (!profile) {
    redirect('/sign-in?redirect=/admin/invoice-generator' as never);
  }

  // Account managers invoice the clients whose LLC orders they work, so this
  // section is open to them as well.
  if (profile.role !== 'administrator' && profile.role !== 'account_manager') {
    return (
      <div className="flex items-center justify-center py-12 px-4 font-inter">
        <div className="w-full max-w-md p-8 bg-white border border-[#e0d9f7] rounded-2xl shadow-[0_1px_4px_rgba(52,8,143,0.06)] text-center space-y-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 text-red-600 rounded-full border border-red-100">
            <ShieldAlert size={28} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-manrope text-gray-900">Access Denied</h2>
            <p className="text-sm text-gray-500 font-inter leading-relaxed">
              The invoice generator is restricted to Administrator and Account Manager accounts.
              Your account has the role of{' '}
              <span className="font-semibold text-gray-700 capitalize select-text">{profile.role}</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <InvoiceGeneratorForm />;
}
