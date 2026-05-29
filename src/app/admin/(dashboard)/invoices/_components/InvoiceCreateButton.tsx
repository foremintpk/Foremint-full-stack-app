'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { InvoiceModal } from './InvoiceModal';

export function InvoiceCreateButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="h-10 px-5 bg-[#34088f] hover:bg-[#34088f]/90 text-white rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-[0_1px_4px_rgba(52,8,143,0.06)] hover:shadow-[0_6px_20px_rgba(52,8,143,0.1)] shrink-0 font-inter"
      >
        <Plus className="w-4 h-4" />
        New Invoice
      </button>

      {isOpen && (
        <InvoiceModal
          mode="create"
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
export default InvoiceCreateButton;
