/**
 * @file src/lib/admin/adminNavConfig.ts
 * @description Master navigation configuration list for the Foremint Admin Dashboard.
 * 
 * 1. Server vs Client choice rationale: Shared static config used by both Server Components (to pass initial props) and Client Components (to render the navigation menu).
 * 2. Caching layer: Pre-defined static configuration, no DB round-trip required.
 * 3. RBAC: Controls dashboard navigation paths.
 * 4. Revalidation / Cache Busting: N/A.
 */

import { NavItem } from '@/types/admin';

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Overview',
    href: '/admin/overview',
    icon: 'LayoutDashboard',
  },
  {
    label: 'LLC Registrations',
    href: '/admin/llc-registrations',
    icon: 'Building2',
    badgeKey: 'llcRegistrations',
  },
  {
    label: 'PayPal Accounts',
    href: '/admin/paypal-accounts',
    icon: 'CreditCard',
  },
  {
    label: 'Addons',
    href: '/admin/addons',
    icon: 'Puzzle',
  },
  {
    label: 'Packages',
    href: '/admin/packages',
    icon: 'Layers',
  },
  {
    label: 'Coupons',
    href: '/admin/coupons',
    icon: 'TicketPercent',
  },
  {
    label: 'Invoices',
    href: '/admin/invoices',
    icon: 'FileText',
  },
  {
    label: 'Expenses',
    href: '/admin/expenses',
    icon: 'Receipt',
  },
  {
    label: 'Users',
    href: '/admin/users',
    icon: 'Users',
  },
  {
    label: 'B2B Customers',
    href: '/admin/b2b-customers',
    icon: 'Briefcase',
  },
  {
    label: 'Support Tickets',
    href: '/admin/queries',
    icon: 'LifeBuoy',
    badgeKey: 'tickets',
  },
  {
    label: 'Blogs',
    href: '/admin/blogs',
    icon: 'BookOpen',
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: 'Settings',
  },
];
