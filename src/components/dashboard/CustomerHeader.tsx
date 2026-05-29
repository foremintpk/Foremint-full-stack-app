'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { RefreshCw, LogOut, Menu, Loader2, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Profile, CustomerNotification } from '@/types/dashboard';
import { clearCustomerNotifCache } from '@/lib/dashboard/notificationCache';
import { CustomerBreadcrumb } from './CustomerBreadcrumb';
import { CustomerNotificationDropdown } from './CustomerNotificationDropdown';

interface CustomerHeaderProps {
  profile: Profile;
  initialNotifications: CustomerNotification[];
  onBadgeCountChange?: (count: number) => void;
  onMenuToggle?: () => void;
}

export function CustomerHeader({
  profile,
  initialNotifications,
  onBadgeCountChange,
  onMenuToggle,
}: CustomerHeaderProps) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRefresh = () => {
    startTransition(async () => {
      clearCustomerNotifCache();
      router.refresh();
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
      className="h-14 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between z-30 flex-shrink-0"
      style={{ minHeight: '56px' }}
    >
      {/* Left section: Drawer Menu trigger (Mobile) & Breadcrumbs (Desktop) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          aria-label="Toggle navigation menu"
          className="p-2 -ml-2 rounded-full text-gray-500 hover:text-black hover:bg-gray-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <CustomerBreadcrumb />
        </div>
        <span className="sm:hidden text-sm font-bold text-black font-manrope">
          Customer Portal
        </span>
      </div>

      {/* Right Section: Sync actions + Notification + Profile dropdown */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Refresh Sync button */}
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

        {/* Notifications Dropdown */}
        <CustomerNotificationDropdown
          userId={profile.id}
          initialNotifications={initialNotifications}
          onBadgeCountChange={onBadgeCountChange}
        />

        <div className="h-5 w-px bg-gray-200" />

        {/* Profile menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 focus:outline-none"
            aria-label="Profile menu"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || 'Customer Avatar'}
                className="w-8 h-8 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <span className="w-8 h-8 rounded-full bg-[#34088f] text-white flex items-center justify-center text-xs font-bold font-manrope">
                {getInitials(profile.full_name, profile.email)}
              </span>
            )}
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2.5 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <p className="text-xs font-bold text-black truncate font-manrope">
                  {profile.full_name || 'Customer Account'}
                </p>
                <p className="text-[10px] text-gray-500 truncate font-inter mt-0.5">
                  {profile.email}
                </p>
                <span className="inline-flex items-center px-2 py-0.5 mt-2 rounded-full text-[8px] font-bold bg-[#34088f]/10 text-[#34088f] uppercase tracking-wider font-manrope">
                  Customer
                </span>
              </div>

              <div className="py-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setProfileOpen(false)}
                  className="px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium"
                >
                  <Settings className="w-4 h-4" />
                  <span>Profile Settings</span>
                </Link>
                <a
                  href="/api/auth/logout"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.replace('/api/auth/logout');
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
