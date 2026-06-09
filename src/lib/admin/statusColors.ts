/**
 * @file src/lib/admin/statusColors.ts
 * @description Master color mapping variables matching the dashboard visual requirements.
 * 
 * 1. Server vs Client choice rationale: Static definitions shared by Server/Client components.
 * 2. Caching layer: N/A.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: N/A.
 */

export const STATUS_COLORS = {
  pending:            '#f59e0b',
  initialized:        '#3b82f6',
  submitted_in_state: '#8b5cf6',
  ein_pending:        '#f97316',
  formed:             '#10b981',
  cancelled:          '#ef4444',
  unpaid:             '#f59e0b',
  paid:               '#10b981',
} as const;

export type StatusKey = keyof typeof STATUS_COLORS;
