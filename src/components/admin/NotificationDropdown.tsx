'use client';
import type { Route } from 'next';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SafeAdminNotification, AdminRole } from '@/types/admin';
import {
  clearNotifCache,
  setNotifCache,
  setSessionBadgeCount,
  getSessionBadgeCount,
} from '@/lib/admin/notificationCache';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/admin/actions/markNotificationsRead';
import { playNotificationChime } from '@/lib/notificationSound';

const POLL_INTERVAL_MS = 45_000; // poll every 45s in the background

interface NotificationDropdownProps {
  adminId: string;
  adminRole: AdminRole;
  initialNotifications: SafeAdminNotification[];
  onBadgeCountChange?: (count: number) => void;
}

export function NotificationDropdown({
  adminId,
  adminRole,
  initialNotifications,
  onBadgeCountChange,
}: NotificationDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SafeAdminNotification[]>(() => {
    if (typeof window === 'undefined') return initialNotifications;
    const cachedCount = getSessionBadgeCount();
    // If we know the badge is 0 (from a previous mark-read in this session), trust it
    if (cachedCount === 0) return [];
    return initialNotifications;
  });
  const [badgeCount, setBadgeCount] = useState<number>(() => {
    if (typeof window === 'undefined') return initialNotifications.length;
    const cachedCount = getSessionBadgeCount();
    if (cachedCount !== null) return cachedCount;
    return initialNotifications.length;
  });
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);

  // Play chime when new notifications arrive (badge count increases after initial mount)
  const prevBadgeRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevBadgeRef.current !== null && badgeCount > prevBadgeRef.current) {
      playNotificationChime();
    }
    prevBadgeRef.current = badgeCount;
  }, [badgeCount]);

  // Sync badge count to sidebar and sessionStorage whenever it changes
  useEffect(() => {
    onBadgeCountChange?.(badgeCount);
    setSessionBadgeCount(badgeCount);
  }, [badgeCount, onBadgeCountChange]);

  // Fetch fresh notifications from the server (bypasses browser cache with no-store header)
  const fetchNotifications = useCallback(async (silent = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();

      const unread: SafeAdminNotification[] = (data.items || []).filter(
        (item: SafeAdminNotification) => !item.isRead
      );
      setNotifications(unread);
      setBadgeCount(unread.length);

      setNotifCache({ fetchedAt: Date.now(), count: unread.length, items: unread });
    } catch (err) {
      console.error('Error fetching unread notifications:', err);
    } finally {
      if (!silent) setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Fetch once on mount to get the latest state
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchNotifications(true);
  }, [fetchNotifications]);

  // Re-fetch every time the dropdown is opened (catches any notifications that arrived since last open)
  useEffect(() => {
    if (isOpen) {
      void fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Background polling — keeps the badge count current even when dropdown is closed
  useEffect(() => {
    const id = setInterval(() => void fetchNotifications(true), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      const result = await markAllNotificationsRead(adminId, adminRole);
      if (!result.success) throw new Error(result.error);

      // Optimistic update — wipe state immediately
      setNotifications([]);
      setBadgeCount(0);

      // Clear ALL client caches so a page refresh also sees 0
      clearNotifCache();
      setNotifCache({ fetchedAt: Date.now(), count: 0, items: [] });

      toast.success('All notifications marked as read.');
      setIsOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark notifications read');
      // Re-fetch to resync state in case of partial failure
      void fetchNotifications();
    } finally {
      setLoading(false);
    }
  };

  // Handle click on a single notification
  const handleNotifClick = async (notif: SafeAdminNotification) => {
    setIsOpen(false);

    // Optimistic removal from UI
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    setBadgeCount((prev) => Math.max(0, prev - 1));

    // Update sessionStorage cache to reflect removal
    /* eslint-disable react-hooks/purity */
    setNotifCache({
      fetchedAt: Date.now(),
      count: Math.max(0, badgeCount - 1),
      items: notifications.filter((n) => n.id !== notif.id),
    });
    /* eslint-enable react-hooks/purity */

    // Persist to DB — fire-and-forget, no need to await for UI
    markNotificationRead(notif.id, adminId).catch((err) =>
      console.error('Failed to persist notification read:', err)
    );

    if (notif.link) {
      router.push(notif.link as Route);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle notifications"
        className="p-2 rounded-full text-gray-500 hover:text-black hover:bg-gray-100 transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {badgeCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#ef4444] text-[9px] font-black text-white rounded-full flex items-center justify-center animate-pulse">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-bold text-black uppercase tracking-wider font-manrope">
              Notifications
            </span>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#34088f] hover:text-[#2a0673] disabled:opacity-50 transition-colors font-inter"
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 font-inter">
                No unread notifications.
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className="w-full text-left px-4 py-3.5 hover:bg-gray-50/70 transition-colors block border-l-2 border-transparent hover:border-[#34088f]"
                >
                  <p className="text-xs font-bold text-black font-manrope leading-tight">
                    {notif.title || 'Notification'}
                  </p>
                  {notif.body && (
                    <p className="text-[11px] text-gray-500 mt-1 font-inter leading-relaxed">
                      {notif.body}
                    </p>
                  )}
                  <span className="text-[9px] text-gray-400 mt-2 block font-inter">
                    {new Date(notif.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
