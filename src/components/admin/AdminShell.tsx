/**
 * @file src/components/admin/AdminShell.tsx
 * @description The layout orchestrator coordinating sidebar navigation, active header actions, and children components.
 *
 * 1. Server vs Client choice rationale: Client Component ("use client") to orchestrate and synchronize badge counts across header dropdowns and sidebar indicators in real-time.
 * 2. Caching layer: N/A.
 * 3. RBAC: Receives props representing the authenticated profile and restricts UI elements.
 * 4. Revalidation / Cache Busting: N/A.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { AdminProfile, AdminRole, BadgeCounts, SafeAdminNotification } from '@/types/admin';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminScrollLock } from './AdminScrollLock';
import { LlcNameProvider } from '@/context/llc-name-context';
import { BatchJobProvider } from '@/context/batch-job-context';
import { BatchJobBanner } from './BatchJobBanner';
import { AdminBadgeContext } from '@/context/admin-badge-context';
import { RealtimeProvider } from '@/components/realtime/RealtimeProvider';
import {
  AdminRealtimeManager,
  useAdminRealtime,
} from '@/components/realtime/AdminRealtimeManager';
import { useRefreshOrchestrator } from '@/lib/hooks/useRefreshOrchestrator';

interface AdminShellProps {
  adminProfile: AdminProfile;
  badgeCounts: BadgeCounts;
  initialNotifications: SafeAdminNotification[];
  initialLlcNames?: Record<string, string>;
  children: React.ReactNode;
}

// ── Inner shell that consumes RealtimeProvider ─────────────────────────────
// `badgeCounts` is seeded into AdminRealtimeManager by the outer export, so the
// inner shell reads live counts from context rather than taking them as a prop.
function AdminShellInner({
  adminProfile,
  initialNotifications,
  initialLlcNames,
  children,
}: Omit<AdminShellProps, 'badgeCounts'>) {
  // AdminProfile.role is the wider UserRole even though only admin roles reach
  // this shell. Narrow it here rather than casting, so an unexpected role gets
  // the least-privileged nav rather than an administrator's.
  // AdminProfile.role is the wider UserRole even though only staff roles reach
  // this shell. Narrow it here rather than casting, so an unexpected role gets
  // the least-privileged nav rather than an administrator's.
  const navRole: AdminRole =
    adminProfile.role === 'administrator'
      ? 'administrator'
      : adminProfile.role === 'account_manager'
        ? 'account_manager'
        : 'manager';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Visibility-aware 120 s reconciliation for Server-Component-rendered content
  // (LLC grid, stats cards, order tables) that Realtime badge updates do not
  // cover. Paused entirely while the tab is hidden.
  useRefreshOrchestrator();

  const {
    badges: liveBadges,
    setBadges,
    decrementLlcOrderBadge,
  } = useAdminRealtime();

  const handleNotificationBadgeChange = useCallback(
    (unreadNotifCount: number) => {
      setBadges((prev) => {
        if (prev.notifications === unreadNotifCount) return prev;
        return { ...prev, notifications: unreadNotifCount };
      });
    },
    [setBadges]
  );

  // Realtime subscriptions, badge refetching and the fallback reconciliation
  // poll all live in <AdminRealtimeManager>, which owns a single channel for
  // the whole admin shell. This component consumes that state.

  const handleMobileToggle = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  return (
    <AdminBadgeContext.Provider value={{ decrementLlcOrderBadge }}>
      {/* Mounted here, above the routed page, so a batch run survives the
          operator navigating to another admin screen mid-run. */}
      <BatchJobProvider>
      <LlcNameProvider initialNames={initialLlcNames}>
        <AdminScrollLock />
        <div className="flex h-screen w-full overflow-hidden bg-gray-50 font-inter">
          {/* Desktop Sidebar */}
          <div className="hidden lg:relative lg:flex lg:flex-shrink-0 lg:overflow-visible">
            <AdminSidebar badgeCounts={liveBadges} role={navRole} />
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
                  <AdminSidebar badgeCounts={liveBadges} role={navRole} />
                </div>
              </div>
              <div className="absolute inset-0 left-64 h-full w-full" onClick={handleMobileToggle} />
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
            <AdminHeader
              adminProfile={adminProfile}
              initialNotifications={initialNotifications}
              onBadgeCountChange={handleNotificationBadgeChange}
              onMenuToggle={handleMobileToggle}
            />
            <main className="flex-1 overflow-y-auto bg-gray-50/80 focus:outline-none p-4 md:p-6 lg:p-8">
              <div className="max-w-7xl mx-auto space-y-6">
                {children}
              </div>
            </main>
          </div>
        </div>
      </LlcNameProvider>
      <BatchJobBanner />
      </BatchJobProvider>
    </AdminBadgeContext.Provider>
  );
}

// ── Public export wraps the inner shell with the shared realtime client ───
// AdminRealtimeManager sits inside RealtimeProvider (it needs the client) and
// outside the shell, so every admin surface reads one set of live counts from
// one channel.
export function AdminShell(props: AdminShellProps) {
  return (
    <RealtimeProvider>
      <AdminRealtimeManager
        adminId={props.adminProfile.id}
        initialBadges={props.badgeCounts}
      >
        <AdminShellInner {...props} />
      </AdminRealtimeManager>
    </RealtimeProvider>
  );
}
