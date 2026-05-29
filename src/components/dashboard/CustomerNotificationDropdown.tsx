'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CustomerNotification } from '@/types/dashboard';
import {
  getCustomerNotifCache,
  setCustomerNotifCache,
  setCustomerSessionBadgeCount,
  getCustomerSessionBadgeCount,
} from '@/lib/dashboard/notificationCache';
import { markCustomerNotificationsRead } from '@/lib/dashboard/actions';

interface CustomerNotificationDropdownProps {
  userId: string;
  initialNotifications: CustomerNotification[];
  onBadgeCountChange?: (count: number) => void;
}

export function CustomerNotificationDropdown({
  userId,
  initialNotifications,
  onBadgeCountChange,
}: CustomerNotificationDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<CustomerNotification[]>(() => {
    if (typeof window === 'undefined') {
      return initialNotifications.filter((n) => !n.isRead);
    }

    const cached = getCustomerNotifCache();
    return cached ? cached.items.filter((n) => !n.isRead) : initialNotifications.filter((n) => !n.isRead);
  });
  const [badgeCount, setBadgeCount] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return initialNotifications.filter((n) => !n.isRead).length;
    }

    const cachedCount = getCustomerSessionBadgeCount();
    if (cachedCount !== null) return cachedCount;

    const cached = getCustomerNotifCache();
    return cached ? cached.count : initialNotifications.filter((n) => !n.isRead).length;
  });
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onBadgeCountChange) {
      onBadgeCountChange(badgeCount);
    }
    setCustomerSessionBadgeCount(badgeCount);
  }, [badgeCount, onBadgeCountChange]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      
      const unreadItems = data.items.filter((n: CustomerNotification) => !n.isRead);
      const unreadCount = unreadItems.length;
      setNotifications(unreadItems);
      setBadgeCount(unreadCount);

      setCustomerNotifCache({
        fetchedAt: Date.now(),
        count: unreadCount,
        items: unreadItems,
      });
    } catch (err) {
      console.error('Error fetching unread notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      void fetchNotifications();
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      const result = await markCustomerNotificationsRead(userId);
      if (!result.success) throw new Error(result.error);

      // Clear local notifications once they are read
      setNotifications([]);
      setBadgeCount(0);
      
      setCustomerNotifCache({
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

  const handleNotifClick = async (notif: CustomerNotification) => {
    setIsOpen(false);

    // Remove from local view state immediately
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    setBadgeCount((prev) => Math.max(0, prev - 1));

    // Update cache
    const cached = getCustomerNotifCache();
    if (cached) {
      const updatedItems = cached.items.map((n) =>
        n.id === notif.id ? { ...n, isRead: true } : n
      );
      setCustomerNotifCache({
        fetchedAt: cached.fetchedAt,
        count: Math.max(0, cached.count - 1),
        items: updatedItems,
      });
    }

    // Call server action to mark notification read in database by hitting the endpoint or using custom resolver.
    // In our actions, we have markCustomerNotificationsRead. For individual notification, we can reuse or just call the database update directly in a server action.
    // Let's call the API/action to mark it read
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notif.id);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }

    if (notif.link) {
      router.push(notif.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
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

      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-bold text-black uppercase tracking-wider font-manrope">
              Notifications
            </span>
            {badgeCount > 0 && (
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

          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 font-inter">
                No notifications.
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-gray-50/70 transition-colors block border-l-2 border-transparent hover:border-[#34088f] ${
                    !notif.isRead ? 'bg-purple-50/30 font-semibold' : ''
                  }`}
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
