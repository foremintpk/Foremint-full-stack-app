'use client';

import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { Profile, CustomerNotification } from '@/types/dashboard';
import { CustomerSidebar } from './CustomerSidebar';
import { CustomerHeader } from './CustomerHeader';
import { LlcNameProvider } from '@/context/llc-name-context';

interface DashboardShellProps {
  profile: Profile;
  initialNotifications: CustomerNotification[];
  initialLlcNames: Record<string, string>;
  isB2B?: boolean;
  badgeCounts: {
    notifications: number;
    actions: number;
  };
  children: React.ReactNode;
}

export function DashboardShell({
  profile,
  initialNotifications,
  initialLlcNames,
  isB2B = false,
  badgeCounts,
  children,
}: DashboardShellProps) {
  const [liveBadgeCounts, setLiveBadgeCounts] = useState(badgeCounts);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNotificationBadgeChange = useCallback((count: number) => {
    setLiveBadgeCounts((prev) => {
      if (prev.notifications === count) return prev;
      return { ...prev, notifications: count };
    });
  }, []);

  const handleMobileToggle = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  return (
    <LlcNameProvider initialNames={initialLlcNames}>
      <div className="flex h-screen w-screen overflow-hidden bg-gray-50 font-inter">
        {/* Desktop Sidebar (hidden on mobile, visible on lg) */}
        <div className="hidden lg:relative lg:flex lg:flex-shrink-0 lg:overflow-visible">
          <CustomerSidebar badgeCounts={liveBadgeCounts} isB2B={isB2B} />
        </div>

        {/* Mobile Navigation Drawer Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 lg:hidden animate-in fade-in duration-200">
            <div className="flex w-64 h-full bg-[#34088f] text-white flex-col animate-in slide-in-from-left duration-200">
              <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
                <span className="text-lg font-black tracking-widest text-white uppercase font-manrope">
                  Foremint
                </span>
                <button
                  onClick={handleMobileToggle}
                  aria-label="Close menu"
                  className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <CustomerSidebar badgeCounts={liveBadgeCounts} isB2B={isB2B} />
              </div>
            </div>
            {/* Clickable rest of the screen to close */}
            <div className="absolute inset-0 left-64 h-full w-full" onClick={handleMobileToggle} />
          </div>
        )}

        {/* Main Operational View Port */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <CustomerHeader
            profile={profile}
            initialNotifications={initialNotifications}
            onBadgeCountChange={handleNotificationBadgeChange}
            onMenuToggle={handleMobileToggle}
          />

          {/* Dynamic Page Content Layout */}
          <main className="flex-1 overflow-y-auto bg-gray-50/80 focus:outline-none p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </LlcNameProvider>
  );
}
