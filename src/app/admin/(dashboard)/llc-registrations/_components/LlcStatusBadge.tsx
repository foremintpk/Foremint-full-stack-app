/**
 * @file src/app/admin/(dashboard)/llc-registrations/_components/LlcStatusBadge.tsx
 * @description Status pill indicator with custom borders and background colors.
 * Labels and colours come from the shared order-status registry.
 */

import React from 'react';
import { LlcOrderStatus } from '@/types/admin';
import { getStatusDisplay } from '@/lib/orders/orderStatus';

interface LlcStatusBadgeProps {
  status: LlcOrderStatus;
}

export default function LlcStatusBadge({ status }: LlcStatusBadgeProps): React.JSX.Element {
  // An unrecognised status falls back to a neutral grey pill with a readable
  // label, rather than being mislabelled as Pending.
  const { label, style } = getStatusDisplay(status);

  return (
    <span
      role="status"
      aria-label={`Status: ${label}`}
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
      style={{
        backgroundColor: style?.bg ?? '#f3f4f6',
        color: style?.text ?? '#4b5563',
        borderColor: style?.border ?? '#e5e7eb',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {label}
    </span>
  );
}
