'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Route } from 'next';
import { ChevronLeft, ChevronRight, LayoutDashboard, CreditCard, Bell, LifeBuoy, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getCustomerSidebarCollapsed, setCustomerSidebarCollapsed } from '@/lib/dashboard/notificationCache';
import { cn } from '@/lib/utils';

interface CustomerSidebarProps {
  badgeCounts: {
    notifications: number;
    actions: number;
  };
}

export function CustomerSidebar({ badgeCounts }: CustomerSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCollapsed(getCustomerSidebarCollapsed());
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handleToggle = () => {
    const nextVal = !collapsed;
    setCollapsed(nextVal);
    setCustomerSidebarCollapsed(nextVal);
  };

  const navItems: Array<{ label: string; href: Route; icon: typeof LayoutDashboard; badgeCount?: number }> = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Billing', href: '/dashboard/billing', icon: CreditCard, badgeCount: badgeCounts.actions },
    { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, badgeCount: badgeCounts.notifications },
    { label: 'Support', href: '/dashboard/support', icon: LifeBuoy },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  if (!mounted) {
    return (
      <aside className="bg-[#34088f] w-64 h-screen flex-shrink-0 border-r border-[#ffffff]/10" />
    );
  }

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full bg-[#34088f] text-white transition-all duration-200 z-40 select-none flex-shrink-0 border-r border-[#ffffff]/10 h-screen",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Toggle button protruding right */}
      <button
        onClick={handleToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="
          absolute -right-3 top-[44px] z-50
          hidden lg:flex
          h-6 w-6 items-center justify-center
          rounded-full bg-[#34088f] border-2 border-white
          text-white shadow-md
          transition-all duration-200
          hover:scale-110
        "
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[#ffffff]/10 flex-shrink-0">
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-2 mt-4">
            <Image src="/logo_white.png" alt="Foremint" width={132} height={28} className="h-28 w-auto object-contain" />
            <span className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-white/90">
              Customer
            </span>
          </Link>
        ) : (
          <Image src="/logo_white.png" alt="Foremint" width={28} height={28} className="h-7 w-7 object-contain mx-auto" />
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const badgeVal = item.badgeCount || 0;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 py-2.5 text-sm font-semibold rounded-full mx-1.5 transition-all duration-200 relative select-none",
                collapsed ? "justify-center px-0" : "px-4",
                isActive
                  ? "bg-white text-[#34088f] shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <Icon className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105" />
              {!collapsed && (
                <span className="flex-1 truncate transition-opacity duration-200">
                  {item.label}
                </span>
              )}
              {!collapsed && badgeVal > 0 && (
                <span className="bg-[#ef4444] text-[9px] font-black text-white px-2 py-0.5 rounded-full">
                  {badgeVal}
                </span>
              )}
              {collapsed && badgeVal > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#ef4444] rounded-full animate-ping" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-[#ffffff]/10 flex flex-col gap-1 text-[11px] text-white/50 font-inter flex-shrink-0">
          <p>© {new Date().getFullYear()} Foremint Inc.</p>
          <p>Customer Suite v1.0</p>
        </div>
      )}
    </aside>
  );
}
