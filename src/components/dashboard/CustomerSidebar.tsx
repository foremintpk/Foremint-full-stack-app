'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Route } from 'next';
import { ChevronLeft, ChevronRight, LayoutDashboard, CreditCard, Bell, LifeBuoy, Settings, Mail } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getCustomerSidebarCollapsed, setCustomerSidebarCollapsed } from '@/lib/dashboard/notificationCache';
import { cn } from '@/lib/utils';

interface CustomerSidebarProps {
  badgeCounts: {
    notifications: number;
    actions: number;
    tickets?: number;
  };
  isB2B?: boolean;
}

export function CustomerSidebar({ badgeCounts, isB2B = false }: CustomerSidebarProps) {
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

  // B2B customers get a trimmed, read-only navigation: Dashboard, Support, Settings.
  const navItems: Array<{ label: string; href: Route; icon: typeof LayoutDashboard; badgeCount?: number }> = isB2B
    ? [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Support', href: '/dashboard/support', icon: LifeBuoy, badgeCount: badgeCounts.tickets },
        { label: 'Settings', href: '/dashboard/settings', icon: Settings },
      ]
    : [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Billing', href: '/dashboard/billing', icon: CreditCard, badgeCount: badgeCounts.actions },
        { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, badgeCount: badgeCounts.notifications },
        { label: 'Support', href: '/dashboard/support', icon: LifeBuoy, badgeCount: badgeCounts.tickets },
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
            <Image src="/logo_white.png" alt="Foremint" width={90} height={28} className="h-auto w-auto object-contain" />
            <span className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-white/90">
              {isB2B ? 'B2B' : 'Customer'}
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

      {/* Contact + Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-[#ffffff]/10 flex flex-col gap-3 flex-shrink-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Need Help?</p>

          {/* WhatsApp */}
          <a
            href="https://wa.me/923164466335"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#25d366]/15 hover:bg-[#25d366]/25 transition-colors group"
          >
            <svg
              className="w-4 h-4 flex-shrink-0 text-[#25d366]"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.097.538 4.07 1.482 5.789L0 24l6.404-1.457A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.653-.511-5.168-1.401l-.371-.22-3.801.867.9-3.706-.242-.383A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#25d366] leading-tight">WhatsApp</span>
              <span className="text-[9px] text-white/50 truncate">+92 316 4466335</span>
            </div>
          </a>

          {/* Email */}
          <a
            href="mailto:support@foremint.pk"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition-colors group"
          >
            <Mail className="w-4 h-4 flex-shrink-0 text-white/70 group-hover:text-white transition-colors" />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-white/90 leading-tight">Email Support</span>
              <span className="text-[9px] text-white/50 truncate">support@foremint.pk</span>
            </div>
          </a>

          <p className="text-[9px] text-white/30 text-center pt-1">
            © {new Date().getFullYear()} Foremint Inc.
          </p>
        </div>
      )}

      {/* Collapsed state — compact contact icons */}
      {collapsed && (
        <div className="pb-4 flex flex-col items-center gap-2 border-t border-[#ffffff]/10 pt-3 flex-shrink-0">
          <a
            href="https://wa.me/923164466335"
            target="_blank"
            rel="noopener noreferrer"
            title="WhatsApp: +92 316 4466335"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#25d366]/15 hover:bg-[#25d366]/25 transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-[#25d366]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.097.538 4.07 1.482 5.789L0 24l6.404-1.457A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.653-.511-5.168-1.401l-.371-.22-3.801.867.9-3.706-.242-.383A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
          </a>
          <a
            href="mailto:support@foremint.pk"
            title="Email: support@foremint.pk"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/15 transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-white/70" />
          </a>
        </div>
      )}
    </aside>
  );
}
