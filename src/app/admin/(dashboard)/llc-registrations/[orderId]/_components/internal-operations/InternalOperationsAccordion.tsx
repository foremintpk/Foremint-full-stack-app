/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/internal-operations/InternalOperationsAccordion.tsx
 * @description Coordinates the internal operations admin-only accordion holding the 4 sub-sections.
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormationDetailsSection } from './FormationDetailsSection';
import { DocumentsSection } from './DocumentsSection';
import { InternalAddonsSection } from './InternalAddonsSection';
import { BillingSection } from './BillingSection';
import type { FormationDetails, OrderDocument, InternalAddon, OrderBilling } from '@/types/admin';

interface InternalOperationsAccordionProps {
 orderId: string;
 adminId: string;
 initialData: {
 formationDetails: FormationDetails;
 documents: OrderDocument[];
 internalAddons: InternalAddon[];
 billing: OrderBilling;
 } | null;
}

export function InternalOperationsAccordion({
 orderId,
 adminId,
 initialData,
}: InternalOperationsAccordionProps): React.JSX.Element | null {
 const [isOpen, setIsOpen] = useState(false);

 if (!initialData) {
 return (
 <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-100 text-sm font-semibold">
 Failed to load internal operations details.
 </div>
 );
 }

 const { formationDetails, documents, internalAddons, billing } = initialData;

 return (
 <div className="bg-white border border-[#e0d9f7] rounded-2xl shadow-[0_1px_4px_rgba(52,8,143,0.06)] overflow-hidden">
 {/* Top-level Accordion Header */}
 <button
 onClick={() => setIsOpen(!isOpen)}
 aria-expanded={isOpen}
 className={cn("w-full flex items-center justify-between px-6 py-4.5 text-left border-b border-[#e0d9f7] transition-colors ", isOpen ? "bg-[#f4f0fe]" : "bg-white hover:bg-[#f4f0fe]/50")}
 >
 <div className="flex items-center gap-2">
 <ShieldAlert className="w-5 h-5 text-[#34088f]" />
 <h3 className="text-sm md:text-base font-bold font-manrope text-gray-900 uppercase tracking-wide">
 Internal Operations (Admin Only)
 </h3>
 </div>
 <ChevronDown
 className={cn("w-5 h-5 text-gray-400 transition-transform duration-200", isOpen && "transform rotate-180")}
 />
 </button>

 {/* Accordion Body: Contains all 4 operations sub-sections */}
 <div
 className={cn("transition-all duration-300 ease-in-out overflow-hidden bg-white", isOpen ? "max-h-[25000px] opacity-100 p-6 space-y-8" : "max-h-0 opacity-0 p-0 pointer-events-none")}
 >
 {/* Sub-section 1: Formation Details */}
 <FormationDetailsSection
 orderId={orderId}
 adminId={adminId}
 initialData={formationDetails}
 />

 {/* Sub-section 2: Documents */}
 <DocumentsSection
 orderId={orderId}
 adminId={adminId}
 initialDocuments={documents}
 />

 {/* Sub-section 3: Internal Addons */}
 <InternalAddonsSection
 orderId={orderId}
 adminId={adminId}
 initialAddons={internalAddons}
 />

 {/* Sub-section 4: Billing */}
 <BillingSection
 orderId={orderId}
 adminId={adminId}
 initialBilling={billing}
 />
 </div>
 </div>
 );
}
