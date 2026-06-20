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

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AdminProfile, BadgeCounts, SafeAdminNotification } from '@/types/admin';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminScrollLock } from './AdminScrollLock';
import { LlcNameProvider } from '@/context/llc-name-context';
import { AdminBadgeContext } from '@/context/admin-badge-context';
import { RealtimeProvider, useRealtime } from '@/components/realtime/RealtimeProvider';
import { getAdminBadgeCounts } from '@/lib/admin/actions/getAdminBadgeCounts';
import { useRefreshOrchestrator } from '@/lib/hooks/useRefreshOrchestrator';
import { toast } from 'sonner';

interface AdminShellProps {
  adminProfile: AdminProfile;
  badgeCounts: BadgeCounts;
  initialNotifications: SafeAdminNotification[];
  initialLlcNames?: Record<string, string>;
  children: React.ReactNode;
}

// ── Inner shell that consumes RealtimeProvider ─────────────────────────────
function AdminShellInner({
  adminProfile,
  badgeCounts,
  initialNotifications,
  initialLlcNames,
  children,
}: AdminShellProps) {
  const [liveBadges, setLiveBadges] = useState<BadgeCounts>(badgeCounts);
  useRefreshOrchestrator(); // 60 s full-page reconciliation
  const supabase = useRealtime();
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
  // Admins can SELECT all rows so postgres_changes delivers reliably.
  // Any insert/update on watched tables triggers a debounced count refetch.
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'query_messages' }, scheduleRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, scheduleRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'billing_entries' }, scheduleRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_order_views' }, scheduleRefetch)
      .subscribe();

    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // ── New-ticket toast notification ─────────────────────────────────────────
  // Listen for INSERT on queries so the admin sees a toast the moment a
  // customer opens a new ticket — before the badge count re-renders.
  useEffect(() => {
    const channel = supabase
      .channel('admin-new-ticket-toast')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'queries' },
        (payload) => {
          const subject = (payload.new as Record<string, unknown>)?.subject as string | undefined;
          toast.info(`New support ticket${subject ? `: "${subject}"` : ''}`, {
            description: 'A customer just opened a ticket.',
            action: { label: 'View', onClick: () => { window.location.href = '/admin/queries'; } },
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  // ── New-message toast (customer replied) ──────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('admin-new-message-toast')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'query_messages' },
        (payload) => {
          const senderId = (payload.new as Record<string, unknown>)?.sender_id as string | undefined;
          // Only toast for messages NOT from this admin
          if (senderId && senderId !== adminProfile.id) {
            toast.info('New support reply', {
              description: 'A customer replied to a support ticket.',
              action: { label: 'View', onClick: () => { window.location.href = '/admin/queries'; } },
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, adminProfile.id]);

  // ── 30-second fallback badge poll ─────────────────────────────────────────
  // Catches any events the WS channel missed (e.g. during reconnect).
  useEffect(() => {
    const id = setInterval(async () => {
      const fresh = await getAdminBadgeCounts();
      setLiveBadges(fresh);
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <AdminBadgeContext.Provider value={{ decrementLlcOrderBadge }}>
      <LlcNameProvider initialNames={initialLlcNames}>
        <AdminScrollLock />
        <div className="flex h-screen w-full overflow-hidden bg-gray-50 font-inter">
          <div className="relative flex-shrink-0 overflow-visible">
            <AdminSidebar badgeCounts={liveBadges} />
          </div>
          <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
            <AdminHeader
              adminProfile={adminProfile}
              initialNotifications={initialNotifications}
              onBadgeCountChange={handleNotificationBadgeChange}
            />
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

// ── Public export wraps the inner shell with the shared realtime client ───
export function AdminShell(props: AdminShellProps) {
  return (
    <RealtimeProvider>
      <AdminShellInner {...props} />
    </RealtimeProvider>
  );
}
