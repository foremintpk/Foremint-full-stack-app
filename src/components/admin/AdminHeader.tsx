/**
 * @file src/components/admin/AdminHeader.tsx
 * @description Sleek top action bar featuring breadcrumbs, dynamic refresh triggers, notifications, and user profiles.
 * 
 * 1. Server vs Client choice rationale: Client Component ("use client") for interactive menus, transitions, and local cache busting.
 * 2. Caching layer: N/A.
 * 3. RBAC: Receives props representing the authenticated profile and restricts UI elements.
 * 4. Revalidation / Cache Busting: Triggers cache clear and Server Action cache invalidation.
 */

'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { RefreshCw, LogOut, User, Loader2 } from 'lucide-react';
import { AdminProfile, SafeAdminNotification, AdminRole } from '@/types/admin';
import { clearNotifCache } from '@/lib/admin/notificationCache';
import { refreshAdminData } from '@/lib/admin/actions/refreshAdmin';
import { AdminBreadcrumb } from './AdminBreadcrumb';
import { NotificationDropdown } from './NotificationDropdown';
import { LogoutButton } from '../auth/logout-button';

interface AdminHeaderProps {
 adminProfile: AdminProfile;
 initialNotifications: SafeAdminNotification[];
 onBadgeCountChange?: (count: number) => void;
}

export function AdminHeader({
 adminProfile,
 initialNotifications,
 onBadgeCountChange,
}: AdminHeaderProps) {
 const [profileOpen, setProfileOpen] = useState(false);
 const [isPending, startTransition] = useTransition();
 const profileRef = useRef<HTMLDivElement>(null);

 // Close profile dropdown on click outside
 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
 setProfileOpen(false);
 }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 // Trigger cache clear and server actions to refresh all dashboard cards
 const handleRefresh = () => {
 startTransition(async () => {
 clearNotifCache();
 await refreshAdminData(adminProfile.id);
 });
 };

 const getInitials = (name: string | null, email: string) => {
 if (!name) return email.substring(0, 2).toUpperCase();
 return name
 .split(' ')
 .map((n) => n[0])
 .join('')
 .substring(0, 2)
 .toUpperCase();
 };

 return (
 <header
 className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between z-30 flex-shrink-0"
 style={{ minHeight: '56px' }}
 >
 {/* Breadcrumb section */}
 <div className="flex items-center">
 <AdminBreadcrumb />
 </div>

 {/* Action triggers */}
 <div className="flex items-center gap-4">
 {/* Refresh button with dynamic spinning transition indicator */}
 <button
 onClick={handleRefresh}
 disabled={isPending}
 aria-label="Refresh dashboard data"
 className="p-2 rounded-full text-gray-500 hover:text-black hover:bg-gray-100 transition-colors relative flex items-center justify-center"
 >
 {isPending ? (
 <Loader2 className="w-5 h-5 text-[#34088f] animate-spin" />
 ) : (
 <RefreshCw className="w-4 h-4 transition-transform active:rotate-180" />
 )}
 </button>

 {/* Caching Notifications Dropdown */}
 <NotificationDropdown
   adminId={adminProfile.id}
   adminRole={adminProfile.role as AdminRole}
   initialNotifications={initialNotifications}
   onBadgeCountChange={onBadgeCountChange}
 />

 <div className="h-5 w-px bg-gray-200" />

 {/* Profile popover container */}
 <div className="relative" ref={profileRef}>
 <button
 onClick={() => setProfileOpen(!profileOpen)}
 className="flex items-center gap-2 focus:outline-none"
 aria-label="User profile menu"
 >
 {adminProfile.avatarUrl ? (
 <img
 src={adminProfile.avatarUrl}
 alt={adminProfile.fullName || 'Admin Avatar'}
 className="w-8 h-8 rounded-full object-cover border border-gray-200"
 />
 ) : (
 <span className="w-8 h-8 rounded-full bg-[#34088f] text-white flex items-center justify-center text-xs font-bold font-manrope">
 {getInitials(adminProfile.fullName, adminProfile.email)}
 </span>
 )}
 </button>

 {profileOpen && (
 <div className="absolute right-0 mt-2.5 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
 <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
 <p className="text-xs font-bold text-black truncate font-manrope">
 {adminProfile.fullName || 'Operational User'}
 </p>
 <p className="text-[10px] text-gray-500 truncate font-inter mt-0.5">
 {adminProfile.email}
 </p>
 <span className="inline-flex items-center px-2.5 py-0.5 mt-2 rounded-full text-[9px] font-bold bg-[#34088f]/10 text-[#34088f] uppercase tracking-wider font-manrope">
 {adminProfile.role}
 </span>
 </div>

 <div className="py-1">
 <LogoutButton className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer">
 <LogOut className="w-4 h-4" />
 <span>Sign out</span>
 </LogoutButton>
 </div>
 </div>
 )}
 </div>
 </div>
 </header>
 );
}
