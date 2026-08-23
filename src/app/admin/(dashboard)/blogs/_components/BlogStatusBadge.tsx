import type { BlogStatus } from '@/types/admin';
import type { EffectivePublishState } from '@/lib/blog/publishState';

const STATUS_CONFIG: Record<EffectivePublishState, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-gray-100 text-gray-600 border-gray-200' },
  published: { label: 'Published', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  archived:  { label: 'Archived',  className: 'bg-amber-50 text-amber-700 border-amber-200' },
  // Invalid state: marked published, but published_at is still in the future so
  // the public API correctly hides it. Must not look like a normal Published.
  published_not_live: {
    label: 'Published — Not Live',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

export function BlogStatusBadge({ status }: { status: BlogStatus | EffectivePublishState }) {
  const cfg = STATUS_CONFIG[status as EffectivePublishState] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
