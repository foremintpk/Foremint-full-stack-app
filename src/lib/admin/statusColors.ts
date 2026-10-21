/**
 * @file src/lib/admin/statusColors.ts
 * @description Master color mapping variables matching the dashboard visual requirements.
 * 
 * 1. Server vs Client choice rationale: Static definitions shared by Server/Client components.
 * 2. Caching layer: N/A.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: N/A.
 *
 * Order-status colours come from the shared status registry so they can never
 * drift from the labels and badges; only the payment-status colours live here.
 */

import {
  ORDER_STATUS_VALUES,
  TONE_STYLES,
  getStatusDisplay,
  type OrderStatusKey,
} from '@/lib/orders/orderStatus';

const orderStatusColors = Object.fromEntries(
  [...ORDER_STATUS_VALUES, 'cancelled' as const].map((status) => {
    const { tone } = getStatusDisplay(status);
    return [status, tone ? TONE_STYLES[tone].solid : '#6b7280'];
  })
) as Record<OrderStatusKey, string>;

export const STATUS_COLORS = {
  ...orderStatusColors,
  unpaid: '#f59e0b',
  paid:   '#10b981',
} as const;

export type StatusKey = keyof typeof STATUS_COLORS;
