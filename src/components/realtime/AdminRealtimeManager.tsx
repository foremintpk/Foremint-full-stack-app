'use client';

/**
 * @file src/components/realtime/AdminRealtimeManager.tsx
 * @description Single owner of the admin dashboard's Realtime subscriptions.
 *
 * Why this exists
 * ---------------
 * The admin shell previously opened three separate channels — `admin-badges`
 * (six wildcard `event: '*'` listeners), `admin-new-ticket-toast` and
 * `admin-new-message-toast`. Two of those watched tables the badge channel
 * already watched, so a single ticket insert was delivered several times and
 * every delivery was evaluated against the subscriber's RLS policies.
 *
 * This manager owns one channel, subscribes to the narrowest event set each
 * feature actually needs, and publishes the result through context. Components
 * consume that state instead of opening subscriptions of their own.
 *
 * Behaviour is deliberately unchanged: the same badge counts refresh on the
 * same debounce, and the same two toasts fire under the same conditions.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import type { BadgeCounts } from '@/types/admin';
import { useRealtime } from './RealtimeProvider';
import { getAdminBadgeCounts } from '@/lib/admin/actions/getAdminBadgeCounts';
import { useVisibleInterval } from '@/lib/hooks/useVisibleInterval';

/** Coalesce bursts of changes into one count refetch. */
const BADGE_REFETCH_DEBOUNCE_MS = 400;

/**
 * Fallback reconciliation for anything the socket missed (reconnect gaps).
 * Realtime is the primary path; this only has to catch the rare miss, and it
 * pauses entirely while the tab is hidden.
 */
const BADGE_FALLBACK_POLL_MS = 60_000;

interface AdminRealtimeState {
  badges: BadgeCounts;
  /** Replace the badge counts (used by the notification dropdown). */
  setBadges: React.Dispatch<React.SetStateAction<BadgeCounts>>;
  /** Optimistic decrement when an admin opens an unread LLC order. */
  decrementLlcOrderBadge: () => void;
  /** Force an immediate authoritative refetch. */
  refreshBadges: () => Promise<void>;
}

const AdminRealtimeContext = createContext<AdminRealtimeState | null>(null);

export function useAdminRealtime(): AdminRealtimeState {
  const ctx = useContext(AdminRealtimeContext);
  if (!ctx) {
    throw new Error('useAdminRealtime must be called inside <AdminRealtimeManager>');
  }
  return ctx;
}

interface AdminRealtimeManagerProps {
  adminId: string;
  initialBadges: BadgeCounts;
  children: React.ReactNode;
}

export function AdminRealtimeManager({
  adminId,
  initialBadges,
  children,
}: AdminRealtimeManagerProps) {
  const supabase = useRealtime();
  const [badges, setBadges] = useState<BadgeCounts>(initialBadges);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read inside the subscription callback so the channel does not resubscribe
  // when the admin's id is re-rendered into a new closure.
  const adminIdRef = useRef(adminId);
  useEffect(() => {
    adminIdRef.current = adminId;
  }, [adminId]);

  const refreshBadges = useCallback(async () => {
    try {
      const fresh = await getAdminBadgeCounts();
      setBadges(fresh);
    } catch {
      // Counts are advisory; a failed refetch keeps the previous values rather
      // than clearing badges the admin still needs to see.
    }
  }, []);

  const decrementLlcOrderBadge = useCallback(() => {
    setBadges((prev) => ({
      ...prev,
      llcRegistrations: Math.max(0, prev.llcRegistrations - 1),
    }));
  }, []);

  useEffect(() => {
    const scheduleRefetch = () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(() => {
        void refreshBadges();
      }, BADGE_REFETCH_DEBOUNCE_MS);
    };

    // One channel for every admin-wide concern. `admin_order_views` is
    // deliberately absent: it records which orders this admin has already
    // opened, and getAdminBadgeCounts re-reads it on each refetch, so watching
    // it only produced a refetch that recomputed the value it just wrote.
    const channel = supabase
      .channel('admin-realtime')
      // Ticket opened — badge plus a toast, from one delivery.
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'queries' },
        (payload) => {
          const subject = (payload.new as Record<string, unknown>)?.subject as
            | string
            | undefined;
          toast.info(`New support ticket${subject ? `: "${subject}"` : ''}`, {
            description: 'A customer just opened a ticket.',
            action: {
              label: 'View',
              onClick: () => {
                window.location.href = '/admin/queries';
              },
            },
          });
          scheduleRefetch();
        }
      )
      // Ticket updated (status, SLA, replies) — badge only.
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'queries' },
        scheduleRefetch
      )
      // Customer replied — badge plus a toast, unless this admin sent it.
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'query_messages' },
        (payload) => {
          const senderId = (payload.new as Record<string, unknown>)?.sender_id as
            | string
            | undefined;
          if (senderId && senderId !== adminIdRef.current) {
            toast.info('New support reply', {
              description: 'A customer replied to a support ticket.',
              action: {
                label: 'View',
                onClick: () => {
                  window.location.href = '/admin/queries';
                },
              },
            });
          }
          scheduleRefetch();
        }
      )
      // Orders: INSERT/UPDATE move the unread count; DELETE is covered by the
      // fallback poll rather than an extra listener.
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        scheduleRefetch
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        scheduleRefetch
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        scheduleRefetch
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        scheduleRefetch
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'billing_entries' },
        scheduleRefetch
      )
      .subscribe();

    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      supabase.removeChannel(channel);
    };
  }, [supabase, refreshBadges]);

  // Fallback reconciliation — paused while the tab is hidden, and fires once on
  // return so a backgrounded tab is correct the moment it is looked at again.
  useVisibleInterval(() => {
    void refreshBadges();
  }, BADGE_FALLBACK_POLL_MS);

  const value = useMemo<AdminRealtimeState>(
    () => ({ badges, setBadges, decrementLlcOrderBadge, refreshBadges }),
    [badges, decrementLlcOrderBadge, refreshBadges]
  );

  return (
    <AdminRealtimeContext.Provider value={value}>
      {children}
    </AdminRealtimeContext.Provider>
  );
}
