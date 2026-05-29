/**
 * @file src/components/admin/AdminSidebar.tsx
 * @description Beautiful, collapsing sidebar element utilizing static configs and localStorage states.
 * 
 * 1. Server vs Client choice rationale: Client Component ("use client") for dynamic collapsing, state persistence, and badge bindings.
 * 2. Caching layer: Layer 4 - localStorage for fm_sidebar_collapsed preferences.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: N/A.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/admin/adminNavConfig';
import { BadgeCounts } from '@/types/admin';
import { getSidebarCollapsed, setSidebarCollapsed } from '@/lib/admin/notificationCache';
import { SidebarNavItem } from './SidebarNavItem';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
    badgeCounts: BadgeCounts;
}

export function AdminSidebar({ badgeCounts }: AdminSidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Sync mounted flag and load collapse preference after hydration
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setCollapsed(getSidebarCollapsed());
            setMounted(true);
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);

    const handleToggle = () => {
        const nextVal = !collapsed;
        setCollapsed(nextVal);
        setSidebarCollapsed(nextVal);
    };

    if (!mounted) {
        // Return placeholder during SSR to avoid mismatch
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
            {/* Toggle button — always visible on desktop, absolute position protruding right */}
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
                    <Link href="/admin" className="flex items-center gap-2 mt-4">
                        <Image src="/logo_white.png" alt="Foremint" width={132} height={28} className="h-28 w-auto object-contain" />
                        <span className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-white/90">
                            Admin
                        </span>
                    </Link>
                ) : (
                    <Image src="/logo_white.png" alt="Foremint" width={28} height={28} className="h-7 w-7 object-contain mx-auto" />
                )}
            </div>

            {/* Navigation List */}
            <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
                {NAV_ITEMS.map((item) => {
                    let count = 0;
                    if (item.badgeKey) {
                        count = badgeCounts[item.badgeKey] || 0;
                    }

                    return (
                        <SidebarNavItem
                            key={item.href}
                            item={item}
                            collapsed={collapsed}
                            badgeCount={count}
                        />
                    );
                })}
            </nav>

            {/* Sidebar Footer */}
            {!collapsed && (
                <div className="p-4 border-t border-[#ffffff]/10 flex flex-col gap-1 text-[11px] text-white/50 font-inter flex-shrink-0">
                    <p>© {new Date().getFullYear()} Foremint Inc.</p>
                    <p>Operations Suite v1.0</p>
                </div>
            )}
        </aside>
    );
}
