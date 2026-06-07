/**
 * @file src/app/admin/(dashboard)/users/_components/UserTable.tsx
 * @description Server Component that renders a responsive grid layout of users.
 */

import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { AdminUser, UserRole } from '@/types/admin';
import { UserRow } from './UserRow';
import { UserCard } from './UserCard';

interface UserTableProps {
  users: AdminUser[];
}

export async function UserTable({ users }: UserTableProps): Promise<React.JSX.Element | null> {
  // Fetch current admin information on the server
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const sessionUser = claimsData?.claims;

  if (!sessionUser) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', sessionUser.sub)
    .single();

  const currentAdminRole = (profile?.role || 'customer') as UserRole;
  const currentAdminId = sessionUser.sub;

  return (
    <div className="w-full">
      {/* Mobile Stack View */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            currentAdminRole={currentAdminRole}
            currentAdminId={currentAdminId}
          />
        ))}
      </div>

      {/* Desktop Grid Table View */}
      <div className="hidden md:block w-full border border-[#e0d9f7] rounded-2xl bg-white shadow-[0_1px_4px_rgba(52,8,143,0.06)] font-inter">
        {/* Table Header */}
        <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_1fr_0.8fr] gap-0 px-6 py-3.5 bg-[#f4f0fe] border-b border-[#e0d9f7] rounded-t-2xl text-xs font-semibold text-[#34088f] uppercase tracking-wider select-none font-manrope">
          <div>Name / Email</div>
          <div>Phone</div>
          <div>Role</div>
          <div>Status</div>
          <div>Joined</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[#e0d9f7] [&>*:last-child]:rounded-b-2xl">
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              currentAdminRole={currentAdminRole}
              currentAdminId={currentAdminId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
export default UserTable;
