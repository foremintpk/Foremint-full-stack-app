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

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AdminProfile, BadgeCounts, SafeAdminNotification } from '@/types/admin';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { LlcNameProvider } from '@/context/llc-name-context';
import { AdminBadgeContext } from '@/context/admin-badge-context';
import { createClient } from '@/lib/supabase/client';
import { getAdminBadgeCounts } from '@/lib/admin/actions/getAdminBadgeCounts';

interface AdminShellProps {
  adminProfile: AdminProfile;
  badgeCounts: BadgeCounts;
  initialNotifications: SafeAdminNotification[];
  initialLlcNames?: Record<string, string>;
  children: React.ReactNode;
}

export function AdminShell({
  adminProfile,
  badgeCounts,
  initialNotifications,
  initialLlcNames,
  children,
}: AdminShellProps) {
  // Synchronized client-side state for badges (real-time decrease/increase)
  const [liveBadges, setLiveBadges] = useState<BadgeCounts>(badgeCounts);
  const supabase = useMemo(() => createClient(), []);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNotificationBadgeChange = useCallback((unreadNotifCount: number) => {
    setLiveBadges((prev) => {
      if (prev.notifications === unreadNotifCount) return prev;
      return { ...prev, notifications: unreadNotifCount };
    });
  }, []);

  const decrementLlcOrderBadge = useCallback(() => {
    setLiveBadges((prev) => ({
      ...prev,
      llcRegistrations: Math.max(0, prev.llcRegistrations - 1),
    }));
  }, []);

  // ── Realtime sidebar badges ──────────────────────────────────────────────
  // Admins can SELECT all rows, so postgres_changes delivers reliably here.
  // Any insert/update on the watched tables triggers a debounced count refetch.
  useEffect(() => {
    const scheduleRefetch = () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(async () => {
        const fresh = await getAdminBadgeCounts();
        setLiveBadges(fresh);
      }, 400);
    };

    const channel = supabase
      .channel('admin-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, scheduleRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queries' }, scheduleRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, scheduleRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'billing_entries' }, scheduleRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_order_views' }, scheduleRefetch)
      .subscribe();

    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <AdminBadgeContext.Provider value={{ decrementLlcOrderBadge }}>
    <LlcNameProvider initialNames={initialLlcNames}>
      <div className="flex h-screen w-screen overflow-hidden bg-gray-50 font-inter">
        {/* Sidebar navigation controls */}
        <div className="relative flex-shrink-0 overflow-visible">
          <AdminSidebar badgeCounts={liveBadges} />
        </div>

        {/* Main operational view port */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Sleek top actions header */}
          <AdminHeader
            adminProfile={adminProfile}
            initialNotifications={initialNotifications}
            onBadgeCountChange={handleNotificationBadgeChange}
          />

          {/* Dynamic page content layout */}
          <main className="flex-1 overflow-y-auto bg-gray-50/80 focus:outline-none p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </LlcNameProvider>
    </AdminBadgeContext.Provider>
  );
}
