import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Invoice, UserRole } from '@/types/admin';
import { InvoiceRow } from './InvoiceRow';
import { InvoiceActionMenu } from './InvoiceActionMenu';
import { formatDate, formatPKR } from '@/lib/admin/formatters';

interface InvoiceTableProps {
  invoices: Invoice[];
}

export async function InvoiceTable({ invoices }: InvoiceTableProps) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const sessionUser = claimsData?.claims;

  if (!sessionUser) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', sessionUser.sub)
    .single();

  const currentAdminRole = (profile?.role || 'customer') as UserRole;

  return (
    <div className="w-full font-inter">
      {/* Mobile Stack View */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {invoices.map((invoice) => {
          return (
            <div
              key={invoice.id}
              className="p-5 bg-white border border-[#e0d9f7] rounded-2xl transition-all duration-150 select-text flex flex-col gap-4 shadow-[0_1px_4px_rgba(52,8,143,0.06)] hover:shadow-[0_6px_20px_rgba(52,8,143,0.1)]"
            >
              {/* Header Info */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="inline-block text-[11px] font-bold font-mono text-[#34088f] mb-1">
                    {invoice.invoiceNumber}
                  </span>
                  <h4 className="font-bold text-gray-900 truncate font-manrope text-base">
                    {invoice.name}
                  </h4>
                </div>
                <div className="flex-shrink-0">
                  <InvoiceActionMenu
                    invoice={invoice}
                    currentAdminRole={currentAdminRole}
                  />
                </div>
              </div>

              {/* Notes (Optional) */}
              {invoice.notes && (
                <div className="bg-[#f4f0fe] rounded-xl p-3 text-xs text-gray-600 font-inter border border-[#e0d9f7]/40">
                  <span className="block font-semibold text-[#34088f] mb-0.5">Notes:</span>
                  {invoice.notes}
                </div>
              )}

              {/* Details List */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#e0d9f7] text-xs">
                <div>
                  <span className="block text-gray-400 font-semibold mb-0.5">Date</span>
                  <span className="text-gray-900 font-medium font-manrope">
                    {formatDate(invoice.date)}
                  </span>
                </div>
                <div>
                  <span className="block text-gray-400 font-semibold mb-0.5">Total Amount</span>
                  <span className="text-gray-900 font-bold font-manrope text-sm">
                    {formatPKR(invoice.totalAmountPkr)}
                  </span>
                </div>
                <div>
                  <span className="block text-gray-400 font-semibold mb-0.5">Commission</span>
                  <span className="text-emerald-700 font-bold font-manrope text-sm">
                    {formatPKR(invoice.commissionEarned)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Grid Table View */}
      <div className="hidden md:block w-full border border-[#e0d9f7] rounded-2xl bg-white shadow-[0_1px_4px_rgba(52,8,143,0.06)]">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_1.5fr_1fr_1.2fr_1.2fr_0.6fr] gap-4 px-6 py-3.5 bg-[#f4f0fe] border-b border-[#e0d9f7] rounded-t-2xl text-xs font-semibold text-[#34088f] uppercase tracking-wider select-none font-manrope">
          <div>Invoice #</div>
          <div>Client / Customer</div>
          <div>Date</div>
          <div>Total Amount</div>
          <div>Commission</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[#e0d9f7] [&>*:last-child]:rounded-b-2xl">
          {invoices.map((invoice) => (
            <InvoiceRow
              key={invoice.id}
              invoice={invoice}
              currentAdminRole={currentAdminRole}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
export default InvoiceTable;
