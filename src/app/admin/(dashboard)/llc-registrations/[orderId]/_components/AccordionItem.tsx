/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/AccordionItem.tsx
 * @description Beautiful, reusable Client Component for smooth animated accordions.
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionItemProps {
 title: string;
 defaultOpen?: boolean;
 children: React.ReactNode;
 badge?: React.ReactNode;
 indented?: boolean;
}

export function AccordionItem({
 title,
 defaultOpen = false,
 children,
 badge,
 indented = false,
}: AccordionItemProps): React.JSX.Element {
 const [isOpen, setIsOpen] = useState(defaultOpen);

 return (
 <div className={cn("border-b border-[#f3f4f6] last:border-b-0", indented && "pl-2")}>
 {/* Accordion Trigger Header */}
 <button
 onClick={() => setIsOpen(!isOpen)}
 aria-expanded={isOpen}
 className={cn("w-full flex items-center justify-between py-4 px-5 text-left transition-colors duration-200 hover:bg-gray-50/70", isOpen ? "bg-gray-50/50" : "bg-white")}
 >
 <span className={cn("font-manrope font-semibold text-gray-900 flex items-center gap-2", indented ? "text-xs md:text-sm" : "text-sm md:text-base")}>
 {title}
 {badge && <span className="flex-shrink-0">{badge}</span>}
 </span>
 <ChevronDown
 className={cn("w-4 h-4 text-gray-400 transition-transform duration-200", isOpen && "transform rotate-180")}
 />
 </button>

 {/* Accordion Body */}
 <div
 className={cn("transition-all duration-200 ease-in-out overflow-hidden", isOpen ? "max-h-[5000px] opacity-100 py-4 px-5 bg-white" : "max-h-0 opacity-0 py-0 px-5 pointer-events-none")}
 >
 {children}
 </div>
 </div>
 );
}
