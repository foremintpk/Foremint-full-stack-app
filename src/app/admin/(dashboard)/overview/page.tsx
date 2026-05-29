/**
 * @file src/app/admin/(dashboard)/overview/page.tsx
 * @description Operational dashboard overview page rendering visual stats and breakdowns with strict caching and security.
 * 
 * 1. Server vs Client choice rationale: Server Component by default. Resolves user status, filters, and loads dynamic cards from data caches.
 * 2. Caching layer: Layer 3 - Route Segment Config (revalidate = 120) with Dynamic getOverviewStats cache hitting Layer 1.
 * 3. RBAC: Constrained to authenticated managers and administrators.
 * 4. Revalidation / Cache Busting: revalidate = 120.
 */

import React from 'react';
import { redirect } from 'next/navigation';
import { Building2, CreditCard } from 'lucide-react';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import { getOverviewStats, DATE_RANGES } from '@/lib/admin/getOverviewStats';
import { DateRangeFilter } from '@/types/admin';
import { StatCard } from './_components/StatCard';
import { EarningsCard } from './_components/EarningsCard';
import { OverviewFilters } from './_components/OverviewFilters';

export const revalidate = 120; // 120s TTL on overall dashboard renders

interface PageProps {
 searchParams: Promise<{
 filter?: string;
 }>;
}

export default async function AdminOverviewPage({ searchParams }: PageProps) {
 // 1. Strict Security Authentication & RBAC Checks
 const admin = await getAdminUser();
 if (!admin) {
 redirect('/sign-in?redirect=/admin/overview' as any);
 }

 // 2. Parse and Validate Date filter search parameter
 const resolvedParams = await searchParams;
 let activeFilter: DateRangeFilter = '7d';
 const filterParam = resolvedParams.filter;

 if (
 filterParam &&
 ['today', 'yesterday', '7d', '14d', '30d', '60d', '90d'].includes(filterParam)
 ) {
 activeFilter = filterParam as DateRangeFilter;
 }

 // 3. Resolve active DateRange filter objects
 const activeRange = DATE_RANGES.find((r) => r.key === activeFilter) || DATE_RANGES[2]; // Default to 7d
 const startDateStr = activeRange.startDate().toISOString();
 const endDateStr = activeRange.endDate().toISOString();

 // 4. Fetch dynamic operational summaries from parallel cached query layers
 const stats = await getOverviewStats(activeFilter, startDateStr, endDateStr);

 return (
 <div className="space-y-6 font-inter">
 {/* Header and Title section */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-bold text-black font-manrope">
 Overview
 </h1>
 <p className="text-xs font-semibold text-gray-500 font-inter mt-1">
 Platform performance and aggregates at a glance
 </p>
 </div>

 {/* Date Filter Pills */}
 <OverviewFilters
 activeFilter={activeFilter}
 filters={DATE_RANGES.map((f) => ({ label: f.label, key: f.key }))}
 />
 </div>

 {/* Main summary cards Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* LLC Registrations Summary card */}
 <StatCard
 title="LLC Registrations"
 icon={<Building2 className="w-5 h-5" />}
 iconBg="bg-emerald-50"
 iconColor="text-[#10b981]"
 total={stats.llc.total}
 stats={[
 {
 label: 'Pending',
 value: stats.llc.pending,
 statusKey: 'pending',
 },
 {
 label: 'Processing',
 value: stats.llc.processing,
 statusKey: 'processing',
 },
 {
 label: 'Completed',
 value: stats.llc.completed,
 statusKey: 'completed',
 },
 ]}
 />

 {/* PayPal Accounts Summary card */}
 <StatCard
 title="PayPal Accounts"
 icon={<CreditCard className="w-5 h-5" />}
 iconBg="bg-blue-50"
 iconColor="text-[#3b82f6]"
 total={stats.paypal.total}
 stats={[
 {
 label: 'Pending',
 value: stats.paypal.pending,
 statusKey: 'pending',
 },
 {
 label: 'Processing',
 value: stats.paypal.processing,
 statusKey: 'processing',
 },
 {
 label: 'Completed',
 value: stats.paypal.completed,
 statusKey: 'completed',
 },
 ]}
 />

 {/* Total Earnings breakdown card */}
 <EarningsCard earnings={stats.earnings} />
 </div>

 {/* Footer Meta indicator showing dynamic cache generation times */}
 <div className="text-[10px] font-medium text-gray-400 text-right font-inter">
 Last updated: {new Date(stats.fetchedAt).toLocaleTimeString()}
 </div>
 </div>
 );
}
