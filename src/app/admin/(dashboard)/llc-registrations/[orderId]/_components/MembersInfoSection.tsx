/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/MembersInfoSection.tsx
 * @description Operational section managing LLC members and verifying their submitted credentials.
 */

'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { MemberCard } from './MemberCard';
import type { OrderDetail } from '@/types/admin';

interface MembersInfoSectionProps {
 order: OrderDetail;
 adminId: string;
}

export function MembersInfoSection({
 order,
 adminId,
}: MembersInfoSectionProps): React.JSX.Element {
 const members = order.members || [];

 return (
 <div className="border border-[#e0d9f7] rounded-xl overflow-hidden bg-white shadow-sm p-5 space-y-4">
 {/* Section Header */}
 <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
 <Users className="w-4 h-4 text-[#34088f]" />
 <h4 className="text-xs md:text-sm font-bold font-manrope text-gray-900 uppercase tracking-wide">
 Members ({members.length})
 </h4>
 </div>

 {/* Members Cards Stack List */}
 {members.length === 0 ? (
 <p className="text-sm font-semibold text-gray-400 font-inter py-2">
 No members registered for this LLC order.
 </p>
 ) : (
 <div className="space-y-4">
 {members.map((member) => (
 <MemberCard
 key={member.index}
 orderId={order.id}
 member={member}
 documents={order.documents}
 adminId={adminId}
 />
 ))}
 </div>
 )}
 </div>
 );
}
