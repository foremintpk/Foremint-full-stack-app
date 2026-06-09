/**
 * @file src/app/admin/(dashboard)/llc-registrations/_components/LlcStatusBadge.tsx
 * @description Status pill indicator with custom borders and background colors.
 */

import React from 'react';
import { LlcOrderStatus } from '@/types/admin';

interface StatusStyle {
  bg: string;
  text: string;
  border: string;
  label: string;
}

const BADGE_STYLES: Record<LlcOrderStatus, StatusStyle> = {
  pending: {
    bg: 'bg-[#fef3c7]',
    text: 'text-[#92400e]',
    border: 'border-[#fde68a]',
    label: 'Pending',
  },
  initialized: {
    bg: 'bg-[#dbeafe]',
    text: 'text-[#1e40af]',
    border: 'border-[#bfdbfe]',
    label: 'Initialized',
  },
  submitted_in_state: {
    bg: 'bg-[#ede9fe]',
    text: 'text-[#5b21b6]',
    border: 'border-[#ddd6fe]',
    label: 'Submitted In State',
  },
  ein_pending: {
    bg: 'bg-[#ffedd5]',
    text: 'text-[#9a3412]',
    border: 'border-[#fed7aa]',
    label: 'EIN Pending',
  },
  formed: {
    bg: 'bg-[#d1fae5]',
    text: 'text-[#065f46]',
    border: 'border-[#a7f3d0]',
    label: 'Formed',
  },
  cancelled: {
    bg: 'bg-[#fee2e2]',
    text: 'text-[#991b1b]',
    border: 'border-[#fecaca]',
    label: 'Cancelled',
  },
};

interface LlcStatusBadgeProps {
  status: LlcOrderStatus;
}

export default function LlcStatusBadge({ status }: LlcStatusBadgeProps): React.JSX.Element {
  const style = BADGE_STYLES[status] || BADGE_STYLES.pending;

  return (
    <span
      role="status"
      aria-label={`Status: ${style.label}`}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {style.label}
    </span>
  );
}
