/**
 * @file src/app/admin/(dashboard)/llc-registrations/_components/LlcNewBadge.tsx
 * @description Small, high-end "NEW" unread badge indicating per-admin unread orders.
 */

import React from 'react';

export default function LlcNewBadge(): React.JSX.Element {
 return (
 <span
 role="status"
 aria-label="Unread order"
 className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#34088f] text-white ml-2"
 >
 NEW
 </span>
 );
}
