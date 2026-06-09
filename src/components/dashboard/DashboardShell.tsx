'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Profile, CustomerNotification } from '@/types/dashboard';
import { CustomerSidebar } from './CustomerSidebar';
import { CustomerHeader } from './CustomerHeader';
import { LlcNameProvider } from '@/context/llc-name-context';
import { RealtimeProvider, useRealtime } from '@/components/realtime/RealtimeProvider';
import { useRefreshOrchestrator } from '@/lib/hooks/useRefreshOrchestrator';
import { getCustomerBadgeCounts } from '@/lib/dashboard/getCustomerBadgeCounts';
import { revalidateCustomerDashboard } from '@/lib/dashboard/revalidateCustomerDashboard';
import { toast } from 'sonner';

interface DashboardShellProps {
  profile: Profile;
  initialNotifications: CustomerNotification[];
  initialLlcNames: Record<string, string>;
  isB2B?: boolean;
  badgeCounts: {
    notifications: number;
    actions: number;
    tickets: number;
  };
  children: React.ReactNode;
}

// ── Inner shell — consumes RealtimeProvider ────────────────────────────────
function DashboardShellInner({
  profile,
  initialNotifications,
  initialLlcNames,
  isB2B = false,
  badgeCounts,
  children,
}: DashboardShellProps) {
  const [liveBadgeCounts, setLiveBadgeCounts] = useState(badgeCounts);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useRefreshOrchestrator(); // 60 s full-page reconciliation
  const supabase = useRealtime();
  const router = useRouter();

  // Notification badge stays in sync via the dropdown's own polling callback.
  const handleNotificationBadgeChange = useCallback((count: number) => {
    setLiveBadgeCounts((prev) => {
      if (prev.notifications === count) return prev;
      return { ...prev, notifications: count };
    });
  }, []);

  // ── Realtime: order-level changes → bust server cache + refresh page + badges
  //
  // Regular customers: subscribe to `orders` filtered by user_id (their own orders).
  // B2B customers:     subscribe to `b2b_order_assignments` filtered by b2b_user_id
  //                    (B2B users don't own orders; they access them via assignments).
  //
  // In both cases we must:
  //   1. Call revalidateCustomerDashboard() — busts unstable_cache(revalidate:30)
  //      so the next router.refresh() re-fetches live DB data instead of returning
  //      the cached payload.
  //   2. Call router.refresh() — re-renders the server page (stats cards, LLC grid,
  //      actions accordion) with the now-fresh data.
  //   3. Call getCustomerBadgeCounts() + setLiveBadgeCounts() — updates sidebar
  //      badges immediately (this call has no cache layer).
  useEffect(() => {
    const userId = profile.id;

    const handleOrderChange = async () => {
      await revalidateCustomerDashboard();
      router.refresh();
      const fresh = await getCustomerBadgeCounts();
      setLiveBadgeCounts(fresh);
    };

    let channel;
    if (isB2B) {
      // B2B: new assignment added for this user
      channel = supabase
        .channel(`b2b-assignments-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'b2b_order_assignments',
            filter: `b2b_user_id=eq.${userId}`,
          },
          handleOrderChange
        )
        .subscribe();
    } else {
      // Regular customer: any change to their own orders
      channel = supabase
        .channel(`customer-orders-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${userId}`,
          },
          handleOrderChange
        )
        .subscribe();
    }

    return () => { supabase.removeChannel(channel); };
  }, [supabase, profile.id, isB2B, router]);

  // ── Customer realtime: notifications filtered by recipient_id ─────────────
  // postgres_changes with filter: Supabase only delivers rows matching the
  // filter expression, so no client-side cross-user data leaks.
  useEffect(() => {
    const userId = profile.id;

    const channel = supabase
      .channel(`customer-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        async () => {
          // Bump the unread notification badge immediately; the 30s poll will
          // authoritative-sync in case of any divergence.
          setLiveBadgeCounts((prev) => ({
            ...prev,
            notifications: prev.notifications + 1,
          }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, profile.id]);

  // ── Customer realtime: queries table changes (admin replies, status, viewed) ─
  //
  // This subscription fires for every UPDATE on any of the customer's query rows:
  //   • Admin replies        → last_admin_reply_at updated
  //   • Customer replies     → last_customer_reply_at updated
  //   • Customer views       → last_customer_viewed_at updated (markTicketViewed)
  //   • Status changes       → status column updated
  //   • Escalation           → escalation_level updated
  //
  // Toast logic uses last_customer_viewed_at (not last_customer_reply_at) so that
  // viewing a ticket suppresses the toast on the next subscription fire, without
  // corrupting the SLA data that admin's get_attention_ticket_count() depends on.
  //
  // Badge always refreshed — covers both admin-reply events and view events.
  useEffect(() => {
    const userId = profile.id;

    const channel = supabase
      .channel(`customer-ticket-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'queries',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newRow = payload.new as Record<string, unknown>;
          const lastAdminReply = newRow?.last_admin_reply_at as string | null;
          const lastCustomerReply = newRow?.last_customer_reply_at as string | null;
          const lastCustomerViewed = newRow?.last_customer_viewed_at as string | null;

          // Most-recent timestamp showing customer has engaged with the thread
          // (either viewed OR replied — whichever is more recent)
          const customerSeen = [lastCustomerReply, lastCustomerViewed]
            .filter(Boolean)
            .map((d) => new Date(d!).getTime())
            .reduce((a, b) => Math.max(a, b), 0);

          // Toast only when admin's reply is newer than the customer's latest
          // engagement. This suppresses spurious toasts on markTicketViewed fires.
          if (lastAdminReply && new Date(lastAdminReply).getTime() > customerSeen) {
            const subject = newRow?.subject as string | undefined;
            toast.info(`Support reply received${subject ? ` on "${subject}"` : ''}`, {
              description: 'An admin responded to your ticket.',
              action: {
                label: 'View',
                onClick: () => { window.location.href = '/dashboard/support'; },
              },
            });
          }

          // Always pull a fresh badge count — covers admin reply (+tickets) and
          // customer view events (-tickets after markTicketViewed).
          getCustomerBadgeCounts()
            .then(setLiveBadgeCounts)
            .catch(() => {});
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, profile.id]);

  // ── 30-second badge count fallback poll ───────────────────────────────────
  useEffect(() => {
    const id = setInterval(async () => {
      const fresh = await getCustomerBadgeCounts();
      setLiveBadgeCounts(fresh);
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const handleMobileToggle = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  return (
    <LlcNameProvider initialNames={initialLlcNames}>
      <div className="flex h-screen w-screen overflow-hidden bg-gray-50 font-inter">
        {/* Desktop Sidebar */}
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

// ── Public export wraps the inner shell with the shared realtime client ───
export function DashboardShell(props: DashboardShellProps) {
  return (
    <RealtimeProvider>
      <DashboardShellInner {...props} />
    </RealtimeProvider>
  );
}
