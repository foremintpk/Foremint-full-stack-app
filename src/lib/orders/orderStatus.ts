/**
 * @file src/lib/orders/orderStatus.ts
 * @description Single source of truth for LLC order statuses.
 *
 * Every surface that names a status — the admin dropdown, list badges and
 * filter pills, overview counts, the customer dashboard and the status emails —
 * reads from here, so a label, colour or ordering is changed in one place.
 *
 * Statuses fall into two groups that share the one `orders.status` column:
 *   • formation — the LLC itself, from checkout through to Formation Completed
 *   • itin      — the optional ITIN add-on, worked after formation
 *
 * `cancelled` exists in the database but is deliberately not selectable.
 *
 * Kept free of server-only and React imports so the client dropdown, server
 * actions and tests can all use it.
 */

export type OrderStatusGroup = 'formation' | 'itin';

export type StatusTone =
  | 'amber'
  | 'blue'
  | 'violet'
  | 'indigo'
  | 'orange'
  | 'rose'
  | 'emerald'
  | 'sky'
  | 'cyan'
  | 'teal'
  | 'pink'
  | 'green'
  | 'red';

export interface ToneStyle {
  bg: string;
  text: string;
  border: string;
  /** Solid colour for dots, charts and legends. */
  solid: string;
}

/** Hex values (not Tailwind classes) so any component can apply them inline. */
export const TONE_STYLES: Record<StatusTone, ToneStyle> = {
  amber:   { bg: '#fef3c7', text: '#92400e', border: '#fde68a', solid: '#f59e0b' },
  blue:    { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe', solid: '#3b82f6' },
  violet:  { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe', solid: '#8b5cf6' },
  indigo:  { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe', solid: '#6366f1' },
  orange:  { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa', solid: '#f97316' },
  rose:    { bg: '#fff1f2', text: '#e11d48', border: '#fecdd3', solid: '#dc2626' },
  emerald: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0', solid: '#10b981' },
  sky:     { bg: '#e0f2fe', text: '#075985', border: '#bae6fd', solid: '#0ea5e9' },
  cyan:    { bg: '#cffafe', text: '#155e75', border: '#a5f3fc', solid: '#06b6d4' },
  teal:    { bg: '#ccfbf1', text: '#115e59', border: '#99f6e4', solid: '#14b8a6' },
  pink:    { bg: '#fce7f3', text: '#9d174d', border: '#fbcfe8', solid: '#ec4899' },
  green:   { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', solid: '#22c55e' },
  red:     { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', solid: '#ef4444' },
};

interface StatusDefinition {
  value: string;
  label: string;
  group: OrderStatusGroup;
  tone: StatusTone;
}

/**
 * Selectable statuses, in the order they are presented everywhere
 * (dropdown, filter pills). Do not reorder without meaning to change the UI.
 */
const SELECTABLE_STATUSES = [
  { value: 'pending',              label: 'Pending',               group: 'formation', tone: 'amber'   },
  { value: 'initialized',          label: 'Initialized',           group: 'formation', tone: 'blue'    },
  { value: 'submitted_in_state',   label: 'Submitted in State',    group: 'formation', tone: 'violet'  },
  { value: 'formed_in_state',      label: 'Formed in State',       group: 'formation', tone: 'indigo'  },
  { value: 'ein_pending',          label: 'EIN Pending',           group: 'formation', tone: 'orange'  },
  { value: 'pending_payment',      label: 'Pending Payment',       group: 'formation', tone: 'rose'    },
  { value: 'formation_completed',  label: 'Formation Completed',   group: 'formation', tone: 'emerald' },
  { value: 'itin_initialized',     label: 'ITIN Initialized',      group: 'itin',      tone: 'sky'     },
  { value: 'itin_in_progress',     label: 'ITIN In Progress',      group: 'itin',      tone: 'cyan'    },
  { value: 'itin_received',        label: 'ITIN Received',         group: 'itin',      tone: 'teal'    },
  { value: 'itin_payment_pending', label: 'ITIN Payment Pending',  group: 'itin',      tone: 'pink'    },
  { value: 'itin_process_completed', label: 'ITIN Process Completed', group: 'itin',  tone: 'green'   },
] as const satisfies readonly StatusDefinition[];

export type OrderStatusValue = (typeof SELECTABLE_STATUSES)[number]['value'];

/** Every status a stored order can hold, including the non-selectable one. */
export type OrderStatusKey = OrderStatusValue | 'cancelled';

export interface OrderStatusMeta {
  value: OrderStatusKey;
  label: string;
  group: OrderStatusGroup;
  tone: StatusTone;
}

export const ORDER_STATUS_OPTIONS: readonly OrderStatusMeta[] = SELECTABLE_STATUSES;

export const ORDER_STATUS_VALUES: readonly OrderStatusValue[] = SELECTABLE_STATUSES.map(
  (s) => s.value
);

const CANCELLED: OrderStatusMeta = {
  value: 'cancelled',
  label: 'Cancelled',
  group: 'formation',
  tone: 'red',
};

// A Map, not an object: `'constructor' in {}` is true, and a status string
// arrives from URLs and form posts.
const META_BY_VALUE: ReadonlyMap<string, OrderStatusMeta> = new Map(
  [...SELECTABLE_STATUSES, CANCELLED].map((s) => [s.value, s])
);

export const GROUP_LABELS: Record<OrderStatusGroup, string> = {
  formation: 'LLC Formation',
  itin: 'ITIN',
};

export function isOrderStatus(value: unknown): value is OrderStatusKey {
  return typeof value === 'string' && META_BY_VALUE.has(value);
}

export function isSelectableStatus(value: unknown): value is OrderStatusValue {
  return typeof value === 'string' && value !== 'cancelled' && META_BY_VALUE.has(value);
}

/**
 * Label + colours for any status string. Unknown values (legacy rows, a status
 * added to the DB before the UI) are humanised instead of printing a raw key.
 */
export function getStatusDisplay(status: string | null | undefined): {
  label: string;
  tone: StatusTone | null;
  style: ToneStyle | null;
} {
  const meta = status ? META_BY_VALUE.get(status) : undefined;
  if (meta) return { label: meta.label, tone: meta.tone, style: TONE_STYLES[meta.tone] };

  const label = (status ?? '').replace(/_/g, ' ').trim() || 'Unknown';
  return { label, tone: null, style: null };
}

export function getStatusLabel(status: string | null | undefined): string {
  return getStatusDisplay(status).label;
}

/** Solid colour for a status, for charts and dots. */
export function getStatusColor(status: string | null | undefined): string {
  const { style } = getStatusDisplay(status);
  return style?.solid ?? '#6b7280';
}

export function isItinStatus(status: string | null | undefined): boolean {
  return META_BY_VALUE.get(status ?? '')?.group === 'itin';
}

// ─── Stage classification ────────────────────────────────────────────────────
// Dashboards, counts and document checks ask "how far along is this order",
// not "which exact status". These sets answer that once.

const IN_PROGRESS: ReadonlySet<string> = new Set([
  'initialized',
  'submitted_in_state',
  'formed_in_state',
  'ein_pending',
  'pending_payment',
]);

/**
 * Orders whose LLC is formed and delivered. ITIN statuses belong here: an order
 * only reaches them after Formation Completed, so the LLC itself is done.
 */
export function isFormationCompleteStatus(status: string | null | undefined): boolean {
  return status === 'formation_completed' || isItinStatus(status);
}

/** Orders being worked on that have not yet reached Formation Completed. */
export function isInProgressStatus(status: string | null | undefined): boolean {
  return IN_PROGRESS.has(status ?? '');
}

/**
 * Statuses that mean "waiting on the customer's payment". The bulk payment
 * reminder targets exactly these.
 */
export const PAYMENT_PENDING_STATUSES: readonly OrderStatusValue[] = [
  'pending_payment',
  'itin_payment_pending',
];

const DOCUMENTS_EXPECTED: ReadonlySet<string> = new Set([
  'ein_pending',
  'pending_payment',
]);

/**
 * Orders far enough along that the formation documents are expected on file.
 * Earlier orders have none yet, and counting them as "missing" would drown the
 * real gaps.
 */
export function isDocumentsExpectedStatus(status: string | null | undefined): boolean {
  return DOCUMENTS_EXPECTED.has(status ?? '') || isFormationCompleteStatus(status);
}

// ─── Counting ────────────────────────────────────────────────────────────────

export type StatusCounts = Record<OrderStatusValue, number>;

export function emptyStatusCounts(): StatusCounts {
  return Object.fromEntries(ORDER_STATUS_VALUES.map((v) => [v, 0])) as StatusCounts;
}

/** Tally rows by status. `cancelled` and unknown values are ignored. */
export function countByStatus(rows: ReadonlyArray<{ status: string | null }>): StatusCounts {
  const counts = emptyStatusCounts();
  for (const row of rows) {
    if (row.status && isSelectableStatus(row.status)) counts[row.status]++;
  }
  return counts;
}

// ─── ITIN add-on detection ───────────────────────────────────────────────────

const ITIN_PATTERN = /\bitin\b|individual\s+taxpayer/i;

interface AddonLike {
  id?: unknown;
  title?: unknown;
  name?: unknown;
  addonName?: unknown;
  addon_name?: unknown;
}

/**
 * Whether an order bought the ITIN add-on.
 *
 * Add-ons reach an order two ways: chosen at checkout (stored as ids plus a
 * snapshot carrying the title) or added later by an admin as an internal
 * add-on. Both are checked, and by name — checkout add-on ids are database
 * UUIDs, so the name is the only stable signal.
 */
export function hasItinAddon(input: {
  selectedAddons?: ReadonlyArray<unknown> | null;
  addonsSnapshot?: ReadonlyArray<AddonLike> | null;
  internalAddons?: ReadonlyArray<AddonLike> | null;
}): boolean {
  const ids = (input.selectedAddons ?? []).some(
    (id) => typeof id === 'string' && ITIN_PATTERN.test(id)
  );
  if (ids) return true;

  const named = (list: ReadonlyArray<AddonLike> | null | undefined): boolean =>
    (list ?? []).some((a) =>
      [a?.id, a?.title, a?.name, a?.addonName, a?.addon_name].some(
        (v) => typeof v === 'string' && ITIN_PATTERN.test(v)
      )
    );

  return named(input.addonsSnapshot) || named(input.internalAddons);
}

/**
 * The statuses an admin may pick for an order. ITIN statuses are offered only
 * when the order has the ITIN add-on — or already sits on one, so the current
 * value is never missing from its own dropdown.
 */
export function getSelectableStatuses(opts: {
  hasItin: boolean;
  current?: string | null;
}): readonly OrderStatusMeta[] {
  const showItin = opts.hasItin || isItinStatus(opts.current);
  return ORDER_STATUS_OPTIONS.filter((s) => s.group !== 'itin' || showItin);
}
