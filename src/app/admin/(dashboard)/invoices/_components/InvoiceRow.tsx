import React from 'react';
import { Invoice, UserRole } from '@/types/admin';
import { InvoiceActionMenu } from './InvoiceActionMenu';
import { formatDate, formatPKR } from '@/lib/admin/formatters';

interface InvoiceRowProps {
  invoice: Invoice;
  currentAdminRole: UserRole;
}

export function InvoiceRow({ invoice, currentAdminRole }: InvoiceRowProps) {
  return (
    <div
      role="row"
      className="grid grid-cols-[1fr_1.5fr_1fr_1.2fr_1.2fr_0.6fr] gap-4 px-6 py-4 bg-white border-b border-[#e0d9f7] hover:bg-gray-50/50 transition-all duration-150 items-center select-text font-inter"
    >
      {/* Invoice # */}
      <div role="cell" className="text-sm font-bold font-mono text-[#34088f]">
        {invoice.invoiceNumber}
      </div>

      {/* Client/Customer Name */}
      <div role="cell" className="min-w-0">
        <p className="font-semibold text-gray-900 truncate font-manrope">
          {invoice.name}
        </p>
        {invoice.notes && (
          <p className="text-[10px] text-gray-400 truncate max-w-full font-inter" title={invoice.notes}>
            {invoice.notes}
          </p>
        )}
      </div>

      {/* Date */}
      <div role="cell" className="text-sm text-gray-950 font-medium">
        {formatDate(invoice.date)}
      </div>

      {/* Total Amount PKR */}
      <div role="cell" className="text-sm font-semibold text-gray-900 font-manrope">
        {formatPKR(invoice.totalAmountPkr)}
      </div>

      {/* Commission PKR */}
      <div role="cell" className="text-sm font-semibold text-emerald-700 font-manrope">
        {formatPKR(invoice.commissionEarned)}
      </div>

      {/* Action Menu */}
      <div role="cell" className="flex items-center justify-end">
        <InvoiceActionMenu
          invoice={invoice}
          currentAdminRole={currentAdminRole}
        />
      </div>
    </div>
  );
}
export default InvoiceRow;
