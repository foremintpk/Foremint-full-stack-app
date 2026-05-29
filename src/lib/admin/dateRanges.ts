/**
 * @file src/lib/admin/dateRanges.ts
 * @description Helper date ranges definitions using date-fns.
 * 
 * 1. Server vs Client choice rationale: Shared static definitions.
 * 2. Caching layer: N/A.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: N/A.
 */

import { startOfDay, endOfDay, subDays } from 'date-fns';
import { DateRange } from '@/types/admin';

export const DATE_RANGES: DateRange[] = [
  {
    label: 'Today',
    key: 'today',
    startDate: () => startOfDay(new Date()),
    endDate: () => endOfDay(new Date()),
  },
  {
    label: 'Yesterday',
    key: 'yesterday',
    startDate: () => startOfDay(subDays(new Date(), 1)),
    endDate: () => endOfDay(subDays(new Date(), 1)),
  },
  {
    label: 'Last 7 Days',
    key: '7d',
    startDate: () => startOfDay(subDays(new Date(), 7)),
    endDate: () => endOfDay(new Date()),
  },
  {
    label: 'Last 14 Days',
    key: '14d',
    startDate: () => startOfDay(subDays(new Date(), 14)),
    endDate: () => endOfDay(new Date()),
  },
  {
    label: 'Last 30 Days',
    key: '30d',
    startDate: () => startOfDay(subDays(new Date(), 30)),
    endDate: () => endOfDay(new Date()),
  },
  {
    label: 'Last 60 Days',
    key: '60d',
    startDate: () => startOfDay(subDays(new Date(), 60)),
    endDate: () => endOfDay(new Date()),
  },
  {
    label: 'Last 90 Days',
    key: '90d',
    startDate: () => startOfDay(subDays(new Date(), 90)),
    endDate: () => endOfDay(new Date()),
  },
];
