/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/ReadOnlyField.tsx
 * @description Pure Server Component to render labelled read-only field data as per design system specs.
 */

import React from 'react';

interface ReadOnlyFieldProps {
 label: string;
 value: React.ReactNode;
}

export function ReadOnlyField({ label, value }: ReadOnlyFieldProps): React.JSX.Element {
 return (
  <div className="border-b border-[#f3f4f6] py-2.5">
   <div className="text-xs font-bold font-inter uppercase tracking-wider text-gray-400 mb-0.5">
    {label}
   </div>
   <div className="text-base font-semibold font-inter text-[#111111] leading-relaxed break-words">
    {value || '—'}
   </div>
  </div>
 );
}
