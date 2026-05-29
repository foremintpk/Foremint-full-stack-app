/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/CustomerInfoAccordion.tsx
 * @description Coordinates the customer info accordion container holding the 5 operation sections.
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GeneralInfoSection } from './GeneralInfoSection';
import { FormationInfoSection } from './FormationInfoSection';
import { AddonsSection } from './AddonsSection';
import { MembersInfoSection } from './MembersInfoSection';
import { PaymentsSection } from './PaymentsSection';
import type { OrderDetail, Package, Addon } from '@/types/admin';

interface CustomerInfoAccordionProps {
 order: OrderDetail;
 adminId: string;
 allPackages: Package[];
 allAddons: Addon[];
}

export function CustomerInfoAccordion({
 order,
 adminId,
 allPackages,
 allAddons,
}: CustomerInfoAccordionProps): React.JSX.Element {
 const [isOpen, setIsOpen] = useState(true);

 return (
 <div className="bg-white border border-[#e0d9f7] rounded-2xl shadow-[0_1px_4px_rgba(52,8,143,0.06)] overflow-hidden">
 {/* Top-level Accordion Header */}
 <button
 onClick={() => setIsOpen(!isOpen)}
 aria-expanded={isOpen}
 className={cn("w-full flex items-center justify-between px-6 py-4 text-left border-b border-[#e0d9f7] transition-colors ", isOpen ? "bg-[#f4f0fe]" : "bg-white hover:bg-[#f4f0fe]/50")}
 >
 <div className="flex items-center gap-2">
 <User className="w-5 h-5 text-[#34088f]" />
 <h3 className="text-sm md:text-base font-bold font-manrope text-gray-900 uppercase tracking-wide">
 Customer Information
 </h3>
 </div>
 <ChevronDown
 className={cn("w-5 h-5 text-gray-400 transition-transform duration-200", isOpen && "transform rotate-180")}
 />
 </button>

 {/* Accordion Body: Contains all 5 operation sections */}
 <div
 className={cn("transition-all duration-200 ease-in-out overflow-hidden bg-white", isOpen ? "max-h-[10000px] opacity-100 p-6 space-y-6" : "max-h-0 opacity-0 p-0 pointer-events-none")}
 >
 {/* Section 1: General Info */}
 <GeneralInfoSection order={order} />

 {/* Section 2: Formation Info */}
 <FormationInfoSection order={order} allPackages={allPackages} />

 {/* Section 3: Addons Section */}
 <AddonsSection order={order} allAddons={allAddons} />

 {/* Section 4: Members Info Section */}
 <MembersInfoSection order={order} adminId={adminId} />

 {/* Section 5: Payments Section */}
 <PaymentsSection order={order} adminId={adminId} />
 </div>
 </div>
 );
}
