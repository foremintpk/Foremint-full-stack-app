/**
 * @file src/components/admin/NotificationDropdown.tsx
 * @description Beautiful, premium notifications dropdown incorporating a 4-tier caching strategy.
 * 
 * 1. Server vs Client choice rationale: Client Component ("use client") for interactive dropdown state, client-side caching, and fetching.
 * 2. Caching layer: Layer 4 - sessionStorage caching + Stale-While-Revalidate from /api/admin/notifications.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: Handled via trigger actions.
 */

'use client';
import type { Route } from "next";
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SafeAdminNotification, AdminRole } from '@/types/admin';
import {
  getNotifCache,
  setNotifCache,
  setSessionBadgeCount,
  getSessionBadgeCount,
} from '@/lib/admin/notificationCache';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/admin/actions/markNotificationsRead';

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

    const cached = getNotifCache();
    return cached ? cached.items.filter((item) => !item.isRead) : initialNotifications;
  });
  const [badgeCount, setBadgeCount] = useState<number>(() => {
    if (typeof window === 'undefined') return initialNotifications.length;

    const cachedCount = getSessionBadgeCount();
    if (cachedCount !== null) return cachedCount;

    const cached = getNotifCache();
    return cached ? cached.count : initialNotifications.length;
  });
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Synchronize state changes to sidebar badge counter
  useEffect(() => {
    if (onBadgeCountChange) {
      onBadgeCountChange(badgeCount);
    }
    setSessionBadgeCount(badgeCount);
  }, [badgeCount, onBadgeCountChange]);

  // Fetch updated notifications from API route
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();

      const unreadItems = data.items.filter((item: SafeAdminNotification) => !item.isRead);
      setNotifications(unreadItems);
      setBadgeCount(unreadItems.length);

      // Save to sessionStorage cache
      setNotifCache({
        fetchedAt: Date.now(),
        count: unreadItems.length,
        items: unreadItems,
      });
    } catch (err) {
      console.error('Error fetching unread notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load from sessionStorage cache on component mount and then refresh in background.
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      void fetchNotifications();
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  // Close dropdown on click outside
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

      // Clear local states
      setNotifications([]);
      setBadgeCount(0);

      // Update local storage/session storage cache
      setNotifCache({
        fetchedAt: Date.now(),
        count: 0,
        items: [],
      });

      toast.success('All notifications marked as read.');
      setIsOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark notifications read');
    } finally {
      setLoading(false);
    }
  };

  // Click handler on individual notification rows
  const handleNotifClick = async (notif: SafeAdminNotification) => {
    setIsOpen(false);

    // Remove notification from local view state immediately
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    setBadgeCount((prev) => Math.max(0, prev - 1));

    // Update session storage cache
    const cached = getNotifCache();
    if (cached) {
      const updatedItems = cached.items.filter((n) => n.id !== notif.id);
      setNotifCache({
        fetchedAt: cached.fetchedAt,
        count: Math.max(0, cached.count - 1),
        items: updatedItems,
      });
    }

    // Call server action to mark notification as read in Supabase
    try {
      await markNotificationRead(notif.id, adminId);
    } catch (err) {
      console.error('Failed to mark notification read in database:', err);
    }

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

      {/* Popover Card */}
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

          {/* List Content */}
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
