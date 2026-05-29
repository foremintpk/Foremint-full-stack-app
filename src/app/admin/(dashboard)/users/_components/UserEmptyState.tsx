/**
 * @file src/app/admin/(dashboard)/users/_components/UserEmptyState.tsx
 * @description Server Component for rendering beautiful empty states.
 */

import React from 'react';
import { Users } from 'lucide-react';

interface UserEmptyStateProps {
  filtered?: boolean;
}

export function UserEmptyState({ filtered = false }: UserEmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border border-[#e0d9f7] rounded-2xl shadow-[0_1px_4px_rgba(52,8,143,0.06)] text-center font-inter select-text">
      <div className="w-14 h-14 rounded-full bg-[#f4f0fe] flex items-center justify-center text-[#34088f] mb-4 border border-[#e0d9f7] select-none">
        <Users className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-gray-900 font-manrope mb-1">
        {filtered ? 'No users match your filters' : 'No users found'}
      </h3>
      <p className="text-xs font-semibold text-gray-500 max-w-sm leading-relaxed">
        {filtered
          ? 'Try refining your search queries or resetting status/role selections to discover matching profiles.'
          : 'There are no active users registered in Foremint at this time.'}
      </p>
    </div>
  );
}
export default UserEmptyState;
