/**
 * @file src/components/admin/SidebarNavItem.tsx
 * @description Dynamic, accessible navigation list item component mapping path names to state indicators.
 * 
 * 1. Server vs Client choice rationale: Client Component ("use client") to read and respond to dynamic router pathnames.
 * 2. Caching layer: N/A.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: N/A.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import { NavItem } from '@/types/admin';
import { SidebarBadge } from './SidebarBadge';

interface SidebarNavItemProps {
 item: NavItem;
 collapsed: boolean;
 badgeCount?: number;
 onClick?: () => void;
}

export function SidebarNavItem({
 item,
 collapsed,
 badgeCount = 0,
 onClick,
}: SidebarNavItemProps) {
 const pathname = usePathname();
 const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

 // Dynamically map icon strings to Lucide elements
 const IconComponent = (LucideIcons as any)[item.icon] || LucideIcons.HelpCircle;

 return (
 <Link
 href={item.href as any}
 onClick={onClick}
 aria-current={isActive ? 'page' : undefined}
 title={collapsed ? item.label : undefined}
 className={`group flex items-center gap-3 py-2.5 text-sm font-semibold rounded-full mx-1.5 transition-all duration-200 relative select-none ${
 collapsed ? 'justify-center px-0' : 'px-4'
 } ${
 isActive
 ? 'bg-white text-[#34088f] shadow-sm'
 : 'text-white/80 hover:bg-white/10 hover:text-white'
 }`}
 style={{ fontFamily: 'Inter, sans-serif' }}
 >
 <IconComponent className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105" />
 
 {!collapsed && (
 <span className="flex-1 truncate transition-opacity duration-200">
 {item.label}
 </span>
 )}
 
 {!collapsed && badgeCount > 0 && (
 <SidebarBadge count={badgeCount} />
 )}
 
 {/* Mini notification dot for collapsed sidebar */}
 {collapsed && badgeCount > 0 && (
 <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#ef4444] rounded-full animate-ping" />
 )}
 </Link>
 );
}
